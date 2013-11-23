/*global exports */

/*
 * Routes for handling state in the mahjong game
 */

var _ = require('underscore'),
    ami = require('./ami'),
    config = require('./config'),
    crypto = require('./crypto'),
    fs = require('fs'),
    mahjong = require('./mahjong'),
    mahjong_util = require('../shared/mahjong_util'),
    models = require('./models'),
    Q = require('q'),
    shared = require('../shared/shared');


// Fetch board template for rendering on the client side
var board_tpl = fs.readFileSync('./views/partials/board.html', 'utf8');

exports.addRoutes = function(app) {
    app.get('/', function(req, res){
        res.send('konnichiwa');
    });

    app.get('/analyze/:id?', function(req, res) {
        var hand = req.params.id,
            result = 'use the form /analyze/1p 123456789s BGR9';
        if (hand) {
            hand = mahjong_util.toTileString(hand);
            // hand = _(hand.split('')).map(function (n) {return parseInt(n, 10);});
            var obj = mahjong.main(hand);
            result = 'current hand: ' + mahjong_util.toHandString(hand);
            result += '<br/><br/>' + obj.msg;
            if (obj.msg.indexOf('mahjong') == -1) {
                result += '<br/><br/>shanten is ' + obj.shanten;
                result += '<br/><br/>probably best to throw the ' + mahjong_util.toString(mahjong.findBestDiscard(hand, obj.discard).discard);
            }
        }
        res.send(result);
    });

    app.get('/game/:id?', function(req, res) {
        var game_id = req.params.id,
            tile = req.param('tile', false);
        if (!game_id) {
            return models.createGame([req.session.user_id]).then(function(games) {
                var game = games[0];
                res.redirect((req.headers['x-script-name'] || '') + '/game/' + game._id);
                return renderGame(game, req, res);
            });
        }
        takeTurn(game_id, tile).then(function(game) {
            return renderGame(game, req, res);
        }).fail(function(error) {
            console.log("there was an error");
            console.log(error);
            console.log(error.stack);
        });
    });
};

var renderGame = function(game, req, res) {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    console.log("session id is " + req.session.id);
    var player = game.players[0];
    var result = ami.getDiscard(player.hand, player.discard),
        obj = result.obj,
        recommended = result.recommended;
    var response = {socketIo: {namespace: config.SOCKET_IO_NAMESPACE,
                               token: crypto.encrypt(req.session.id)},
                    moniker: req.session.moniker,
                    hand: player.hand,
                    msg: obj.msg,
                    discards: obj.discard,
                    shanten: obj.shanten,
                    new_tile: game.last_tile,
                    game_id: game._id,
                    recommended: {discard_tile: [recommended.discard],
                                  discard: mahjong_util.toString(recommended.discard),
                                  score: recommended.score}};
    if (req.param('ajax')) {
        res.json(response);
    } else {
        var mobile = /(iPhone|iPod|Android|webOS)/i.test(req.header('User-Agent', ''));
        var cfg = {
            base_path: req.headers['x-script-name'] || '',
            mobile: mobile,
            tile_width: mobile ? 53 : 71, //width + 16
            board_tpl: board_tpl
        };
        if (response.game_id) {
            _.extend(cfg, response);
            if (cfg.new_tile) {
                cfg.partial_hand = cfg.hand.slice(0);
                cfg.partial_hand[cfg.new_tile] -= 1;
            } else {
                cfg.partial_hand = cfg.hand;
            }
            cfg.discards.splice(cfg.discards.indexOf(cfg.recommended.discard_tile[0]), 1);
            cfg.rendered_tiles = shared.renderTiles(cfg.partial_hand, cfg);
            cfg.rendered_tiles = shared.renderTiles(cfg.partial_hand, cfg);
        }

        cfg.js_cfg = JSON.stringify(cfg);
        res.render('game', cfg);
    }
};

var discardTile = function(game, tile) {
    var player = game.players[0];
    tile = parseInt(tile, 10);
    player.discard.push(tile);
    player.hand[tile] -= 1;
    player.last_tile = game.wall.pop();
    player.hand[player.last_tile] += 1;
};

var takeTurn = function(game_id, tile) {
    var deferred = Q.defer();
    if (game_id) {
        models.findOneGame(game_id).then(function(game) {
            if (tile) {
                discardTile(game, tile);
                return models.saveGame(game).then(function() {
                    return deferred.resolve(game);
                });
            } else {
                return deferred.resolve(game);
            }
        });
    }
    return deferred.promise;
};
