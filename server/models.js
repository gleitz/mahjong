/*global require module */

/*
 * Models for mahjong players, hands, and game
 */


/* Imports */
var db = require('./db'),
    ObjectID = require('mongodb').ObjectID,
    mahjong = require('./mahjong'),
    moniker = require('moniker'),
    Q = require('q');

// TODO: disable in production
Q.longStackSupport = true;


/* Exported Modules */
module.exports.createGame = function(player_ids) {
    var insertGame = Q.nbind(db.games.insert, db.games);
    var deal = mahjong.deal(player_ids.length),
        hands = deal.hands,
        i;
    var game = {wall: deal.wall,
                players: [],
                current_player: player_ids[0]
               };
    for (i=0; i<hands.length; i++) {
        var player = {id: player_ids[i],
                      hand: hands[i],
                      discard: [],
                      last_tile: null};
        game.players.push(player);
    }
    return insertGame(game).then(function(games) {
        return games[0];
    });
};

module.exports.findOneGame = function(game_id) {
    var findOneGame = Q.nbind(db.games.findOne, db.games);
    return findOneGame({_id: new ObjectID(game_id)});
};

module.exports.saveGame = function(game) {
    var updateGame = Q.nbind(db.games.update, db.games);
    return updateGame({_id: game._id}, game);
};

module.exports.createPlayer = function() {
    var insertPlayer = Q.nbind(db.players.insert, db.players);
    var player = {name: moniker.choose()
                 };
    return insertPlayer(player).then(function(players) {
        return players[0];
    });
};

module.exports.getOrCreatePlayer = function(player_id) {
    if (player_id) {
        return module.exports.findOnePlayer(player_id);
    } else {
        return module.exports.createPlayer();
    }
};

module.exports.findOnePlayer = function(player_id) {
    var findOnePlayer = Q.nbind(db.players.findOne, db.players);
    return findOnePlayer({_id: new ObjectID(player_id)});
};

module.exports.savePlayer = function(player) {
    var updatePlayer = Q.nbind(db.players.update, db.players);
    return updatePlayer({_id: player._id}, player);
};
