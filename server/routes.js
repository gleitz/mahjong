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

var preventCache = function(res) {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
}

var mobileRegex = /(iPhone|iPod|Android|webOS)/i;
var isMobile = function(req) {
    return mobileRegex.test(req.header('User-Agent', ''))
}

var getResponseJSON = function(game, session) {
    var player_id = session.player_id;
    return models.findOnePlayer(player_id).then(function(player) {
        var seat = getSeat(game.seats, player_id);
        var ami_result = ami.getDiscard(seat.hand, seat.discard),
            ami_recommended = ami_result.recommended;
        var response = {player: player,
                        discard: seat.discard,
                        last_tile: seat.last_tile,
                        hand: seat.hand,
                        msg: ami_result.obj.msg,
                        shanten: ami_result.obj.shanten,
                        recommended: {discard_tile: [ami_recommended.discard]},
                        game: game};
        return response;
    });
};

var renderGame = function(game, req, res) {
    preventCache(res);
    return getResponseJSON(game, req.session).then(function(response) {
        var mobile = isMobile(req);
        var cfg = {
            socketIo: {token: crypto.encrypt(req.session.id)},
            game_id: game._id,
            base_path: req.headers['x-script-name'] || '',
            mobile: mobile,
            tile_width: mobile ? 53 : 71, //width + 16
            board_tpl: board_tpl,
            isSimulation: true
        };
        if (cfg.game_id) {
            _.extend(cfg, response);
            shared.renderPlayerTiles(cfg, cfg.last_tile, cfg);
        }
        cfg.js_cfg = JSON.stringify(cfg);
        res.render('game', cfg);
    });
};

var getSeat = function(seats, player_id) {
    return _.find(seats, function(s) {
        return s.player_id === player_id;
    });
}

var discardTile = function(player_id, game, tile) {
    var seat = getSeat(game.seats, player_id);
    if (!seat) {
        return false;
    }
    tile = parseInt(tile, 10); //TODO(gleitz): should this happen earlier?
    seat.discard.push(tile);
    seat.hand[tile] -= 1;
    seat.last_tile = game.wall.pop();
    seat.hand[seat.last_tile] += 1;
    return true;
};


var takeTurn = function(player_id, game_id, tile) {
    var deferred = Q.defer();
    if (game_id) {
        models.findOneGame(game_id).then(function(game) {
            if (typeof tile === 'number') {
                // Allow 0 but not false, null, undefined, etc.
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
        req.session.player_id = player._id.toString();
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


exports.addSockets = function(io) {

    // Socket triggers
    io.sockets.on('connection', function (socket) {
        socket.on('room', function(game_id) {
            socket.join(game_id);
        })
        socket.on('discard', function(data) {
            var game_id = data.game_id,
                tile = data.tile,
                player_id = socket.handshake.session.player_id;
            return takeTurn(player_id, game_id, tile)
                .then(function(game) {
                    return getResponseJSON(game, socket.handshake.session);
                })
                .then(function(response) {
                    // return socket.emit('response', response);
                    return io.sockets['in'](game_id).emit('response', response)
                })
                .fail(function(error) {
                    console.log("there was an error");
                    console.log(error);
                    console.log(error.stack);
            });
        });
        socket.on('disconnect', function () {
            io.sockets.emit('user disconnected');
        });
    });

};
