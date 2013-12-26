/*global exports */

/*
 * Routes for URL endpoints in the mahjong game.
 */


/* Imports */

var _ = require('underscore'),
    ami = require('./ami'),
    crypto = require('./crypto'),
    fs = require('fs'),
    mahjong = require('./mahjong'),
    mahjong_util = require('../shared/mahjong_util'),
    models = require('./models'),
    Q = require('q'),
    shared = require('../shared/shared'),
    io;

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

var getGameJSON = function(game, player_id) {
    var player_ids = _.map(game.seats, function(seat) { return seat.player_id; }),
        player,
        players,
        seat;
    return models.findPlayers(player_ids).then(function(found_players) {
        players = found_players;
        player = shared.getPlayer(players, player_id);
        if (!player && player_id <=1) {
            player = {_id: player_id,
                      name: 'Computer ' + player_id.toString()};
        }
        seat = shared.getSeat(game.seats, player_id);
        if (!seat) {
            throw new Error('Player is not in this game');
        }
        var player_map = {};
        _.each(players, function(player) {
            player_map[player._id] = player;
        });
        var response = {players: players,
                        player_map: player_map,
                        player: player,
                        discard: seat.discard,
                        last_tile: seat.last_tile,
                        hand: seat.hand,
                        game: game};
        return response;
    });
};

var getResponseJSON = function(game, player_id) {
    var player_ids = _.map(game.seats, function(seat) { return seat.player_id; }),
        player,
        players,
        seat;
    return models.findPlayers(player_ids).then(function(found_players) {
        players = found_players;
        player = shared.getPlayer(players, player_id);
        if (!player && player_id <=1) {
            player = {_id: player_id,
                      name: 'Computer ' + player_id.toString()};
        }
        seat = shared.getSeat(game.seats, player_id);
        if (!seat) {
            throw new Error('Player is not in this game');
        }
        return ami.checkMahjong(shared.getSeat(game.seats, game.current_player_id).hand);
    }).then(function(is_mahjong) {
        if (is_mahjong) {
            var winner_exists = (shared.exists(game.winner_id));
            game.winner_id = game.current_player_id;
            if (!winner_exists) {
                return models.saveGame(game);
            }
        } else {
            return ami.getDiscard(seat.hand, seat.discard);
        }
    }).then(function(ami_result) {
        var is_ami_result = ami_result && ami_result.recommended;
        var player_map = {};
        _.each(players, function(player) {
            player_map[player._id] = player;
        });
        var response = {players: players,
                        player_map: player_map,
                        player: player,
                        discard: seat.discard,
                        last_tile: seat.last_tile,
                        hand: seat.hand,
                        game: game};
        if (is_ami_result) {
            var ami_recommended = ami_result.recommended;
            _.extend(response, {
                msg: ami_result.obj.msg,
                shanten: ami_result.obj.shanten,
                recommended: {discard_tile: [ami_recommended.discard]}
            });
        }
        return response;
    }).fail(function() {
        //TODO: wall was depleted
    });
};

var renderGame = function(game, req, res) {
    preventCache(res);
    var player_id = req.session.player_id;
    return getGameJSON(game, player_id).then(function(response) {
        var mobile = isMobile(req);
        var cfg = {
            socketIo: {token: crypto.encrypt(req.session.id)},
            game_id: game._id,
            base_path: req.headers['x-script-name'] || '',
            mobile: mobile,
            tile_width: mobile ? 53 : 71, //width + 16
            board_tpl: board_tpl,
            isSimulation: true,
            isOpen: req.query.open
        };
        if (cfg.game_id) {
            _.extend(cfg, response);
        }
        cfg.js_cfg = JSON.stringify(cfg);
        res.render('game', cfg);
    }).fail(function() {
        // User is not in this game
        return res.redirect(formatUrl(req, '/play/'));
    });
};

var loadLobby = function(game, player_ids, req, res) {
    return models.findPlayers(player_ids).then(function(players) {
        var mobile = isMobile(req);
        var cfg = {
            socketIo: {token: crypto.encrypt(req.session.id)},
            game_id: game._id.toString(),
            base_path: req.headers['x-script-name'] || '',
            mobile: mobile,
            tile_width: mobile ? 53 : 71, //width + 16
            board_tpl: board_tpl,
            isLobby: true,
            game: game,
            players: players
        };
        cfg.js_cfg = JSON.stringify(cfg);
        return res.render('lobby', cfg);
    });
}

var renderLobby = function(game, req, res) {
    preventCache(res);
    var player_ids = _.map(game.seats, function(seat) { return seat.player_id; });
    if (_.contains(player_ids, req.session.player_id)) {
        return loadLobby(game, player_ids, req, res);
    } else {
        var empty_seat = _.find(game.seats, function(seat) {
            return shared.isComputer(seat.player_id);
        });
        empty_seat.player_id = req.session.player_id;
        return models.saveGame(game).then(function() {
            var player_ids = _.map(game.seats, function(seat) { return seat.player_id; });
            return loadLobby(game, player_ids, req, res);
        });
    }
};

var drawTile = function(game, player_id) {
    var seat = shared.getSeat(game.seats, game.current_player_id);
    //TODO(gleitz): remove this and only draw 13 tiles
    if (shared.sum(seat.hand) == 14) {
        return getResponseJSON(game, player_id);
    } else {
        var next_tile = game.wall.pop();
        seat.last_tile = next_tile;
        seat.hand[next_tile] += 1;
        return models.saveGame(game).then(function() {
            return getResponseJSON(game, player_id);
        });
    }
};


var discardTile = function(player_id, game_id, tile) {
    var deferred = Q.defer();
    if (game_id) {
        models.findOneGame(game_id).then(function(game) {
            if (shared.exists(tile)) {
                var seats = game.seats,
                    seat;
                for (var seat_pos=0; seat_pos<seats.length; seat_pos++) {
                    seat = seats[seat_pos];
                    if (seat.player_id === player_id) {
                        break;
                    }
                }
                if (!seat) {
                    return deferred.reject(new Error('User or game not found'));
                }
                tile = parseInt(tile, 10); //TODO(gleitz): should this happen earlier?
                seat.discard.push(tile);
                seat.hand[tile] -= 1;
                var next_seat = seats[(seat_pos + 1) % seats.length];
                game.current_player_id = next_seat.player_id
                // Allow 0 but not false, null, undefined, etc.
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
        var cfg = {path: formatUrl(req, '/play'),
                   base_path: req.headers['x-script-name'] || ''};
        res.render('home', cfg);
    });

    // Analyze a hand in the following form
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

    app.get('/play/:id?', function(req, res) {
        return models.getOrCreatePlayer(req.session.player_id).then(function(player) {
            addPlayerToSession(req, player);
            var game_id = req.params.id,
                player_id = req.session.player_id;
            if (!game_id) {
                return models.createGame([player_id, 0, 1]).then(function(game) {
                    res.redirect(formatUrl(req, '/play/' + game._id));
                    return renderLobby(game, req, res);
                });
            } else {
                return models.findOneGame(game_id).then(function(game) {
                    return renderLobby(game, req, res);
                });
            }
        });
    });

    // Load a game or play a tile. Can also be used to simulate a
    // mahjong game with AMI playing a single hand
    app.get('/game/:id?', function(req, res) {
        return models.getOrCreatePlayer(req.session.player_id).then(function(player) {
            addPlayerToSession(req, player);
            var game_id = req.params.id,
                player_id = req.session.player_id;
            if (!game_id) {
                return models.createGame([player_id, 0, 1]).then(function(game) {
                    res.redirect(formatUrl(req, '/game/' + game._id));
                    return renderGame(game, req, res);
                });
            } else {
                models.findOneGame(game_id).then(function(game) {
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

var handlePon = function(game_id, from_player_id, to_player_id) {
    return models.findOneGame(game_id).then(function(game) {
        var from_player = shared.getSeat(game.seats, from_player_id);
        var to_player = shared.getSeat(game.seats, to_player_id);
        // take the discarded tile from from_player and give it to toplayer
    });
}

var updateClients = function(game_id, player_id, response) {
    _.each(io.sockets.clients(game_id), function(sub_socket) {
        var game_socket = io.sockets.socket(sub_socket.id);
        var socket_player_id = game_socket.handshake.session.player_id;
        if (socket_player_id === player_id) {
            game_socket.emit('discard_response_this_player', response)
        } else {
            game_socket.emit('discard_response_other_player', response)
        }
    });
};

// discard tile
// tell everyone you discarded
// give opportunity to pon
// next player draws tile
// check for mahjong
// discard

var handleDiscard = function(player_id, game_id, tile) {
    return discardTile(player_id, game_id, tile)
        .then(function(game) {
            return getGameJSON(game, player_id);
        })
        .then(function(response) {
            updateClients(game_id, player_id, response);
            return drawTile(response.game, player_id);
        }).then(function(response) {
            updateClients(game_id, player_id, response);
            var game = response.game;
            if (shared.isComputer(game.current_player_id) &&
                !(shared.exists(game.winner_id) &&
                  game.current_player_id == game.winner_id)) { // AI's turn
                var seat = shared.getSeat(game.seats, game.current_player_id);
                return ami.getDiscard(seat.hand, seat.discard).then(function(ami_result) {
                    var discard_tile = ami_result.recommended.discard;
                    if (ami_result.obj.msg) {
                        console.log(ami_result.obj.msg);
                        console.log(seat);
                        console.log(discard_tile);
                    }
                    // require the computer to take between 700ms-1s to play
                    setTimeout(function() {
                        handleDiscard(game.current_player_id, game_id, discard_tile);
                    }, Math.floor(Math.random() * 300) + 700);
                });
            }
        })
        .fail(function(error) {
            console.log("there was an error");
            console.log(error);
            console.log(error.stack);
        });
}

exports.addSockets = function(_io) {
    io = _io;
    // Socket triggers
    io.sockets.on('connection', function (socket) {
        socket.on('room', function(game_id) {
            socket.join(game_id);
        })
        socket.on('start_game', function(data) {
            io.sockets['in'](data.game_id).emit('start_game', {});
        })
        socket.on('join_lobby', function(data) {
            var game_id = data.game_id;
            return models.findOneGame(game_id).then(function(game) {
                var player_ids = _.map(game.seats, function(seat) { return seat.player_id; });
                return models.findPlayers(player_ids)
            }).then(function(players) {
                io.sockets['in'](game_id).emit('player_joined', {players: players});
            });
        });
        socket.on('discard', function(data) {
            var game_id = data.game_id,
                tile = data.tile,
                player_id = socket.handshake.session.player_id;
            return handleDiscard(player_id, game_id, tile);
        });
        socket.on('disconnect', function () {
            io.sockets.emit('user disconnected');
        });
    });

};
