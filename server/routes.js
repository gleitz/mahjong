/*global exports */

/*
 * Routes for URL endpoints in the mahjong game.
 */


/* Imports */

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


/* Helper Functions */

var formatUrl = function(req, path) {
    return (req.headers['x-script-name'] || '') + path
}

var renderGame = function(game, req, res) {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    console.log("session id is " + req.session.id);
    var player = game.players[0];
    var result = ami.getDiscard(player.hand, player.discard),
        obj = result.obj,
        recommended = result.recommended;
    var response = {socketIo: {namespace: config.SOCKET_IO_NAMESPACE,
                               token: crypto.encrypt(req.session.id)},
                    player_name: req.session.player_name,
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
            board_tpl: board_tpl,
            isSimulation: true
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


var discardTile = function(player_id, game, tile) {
    console.log(player_id);
    var player = _.find(game.players, function(p) {
        console.log(p);
        return p.id === player_id;
    });
    if (!player) {
        return false;
    }
    tile = parseInt(tile, 10); //TODO(gleitz): should this happen earlier?
    player.discard.push(tile);
    player.hand[tile] -= 1;
    player.last_tile = game.wall.pop();
    player.hand[player.last_tile] += 1;
    return true;
};


var takeTurn = function(player_id, game_id, tile) {
    var deferred = Q.defer();
    if (game_id) {
        models.findOneGame(game_id).then(function(game) {
            if (tile) {
                var success = discardTile(player_id, game, tile);
                if (!success) {
                    return deferred.reject(new Error('User or game not found'));
                }
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

var addPlayerToSession = function(req, player) {
    if (!req.session.player_id) {
        req.session.player_id = player._id
    }
    if (!req.session.player_name) {
        req.session.player_name = player.name;
    }
}


/* Exported Functions */

exports.addRoutes = function(app) {

    // Homepage
    app.get('/', function(req, res) {
        var cfg = {path: formatUrl(req, '/game')};
        res.render('home', cfg);
    });

    // Analyze a hand in either form:
    // analyze/111222333p NNN11
    // analyze/?raw_hand=[0,0,2,1,0,0,0,0,0,2,1,0,1,0,0,0,0,0,0,0,0,0,3,2,2,0,0]
    app.get('/analyze/:hand?', function(req, res) {
        var hand = req.params.hand,
            raw_hand = req.query.raw_hand,
            result = 'use the form /analyze/1p 123456789s BGR9';
        if (raw_hand) {
            hand = JSON.parse(raw_hand);
        } else if (hand) {
            hand = mahjong_util.toTileString(hand);
        }
        if (hand) {
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

    // Load a game or play a tile. Can also be used to simulate a
    // mahjong game with AMI playing a single hand
    app.get('/game/:id?', function(req, res) {
        return models.getOrCreatePlayer(req.session.player_id).then(function(player) {
            addPlayerToSession(req, player);
            var game_id = req.params.id,
                tile = req.param('tile', false),
                player_id = req.session.player_id;
            if (!game_id) {
                return models.createGame([player_id]).then(function(game) {
                    res.redirect(formatUrl(req, '/game/' + game._id));
                    return renderGame(game, req, res);
                });
            } else {
                takeTurn(player_id, game_id, tile).then(function(game) {
                    return renderGame(game, req, res);
                }).fail(function(error) {
                    console.log("there was an error");
                    console.log(error);
                    console.log(error.stack);
                });
            }
        });
    });
};
