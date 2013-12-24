/*global require module */

/*
 * Models for the mahjong game
 */


/* Imports */

var _ = require('underscore'),
    db = require('./db'),
    ObjectID = require('mongodb').ObjectID,
    mahjong = require('./mahjong'),
    moniker = require('moniker'),
    Q = require('q');

// TODO: disable in production
Q.longStackSupport = true;


/* Database Objects (these have *._id) */

function Player(name) {
    this.name = name;
}

function Game(wall) {
    this.wall = wall;
    this.seats = [];
    this.current_player_id = null;
}


/* JavaScript Objects */

function Seat(player_id) {
    this.player_id = player_id;
    this.hand = [];
    this.discard = [];
    this.last_tile = null;
}


/* Exported Modules */

module.exports.createGame = function(player_ids) {
    var insertGame = Q.nbind(db.games.insert, db.games);
    var deal = mahjong.deal(player_ids.length),
        hands = deal.hands,
        i;
    var game = new Game(deal.wall);
    game.current_player_id = player_ids[0];
    for (i=0; i<hands.length; i++) {
        var seat = new Seat(player_ids[i]);
        seat.hand = hands[i];
        game.seats.push(seat);
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
    var player = new Player(moniker.choose());
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

module.exports.findPlayers = function(player_ids) {
    var findPlayers = Q.nbind(db.players.find, db.players),
        ids = _.map(player_ids, function(player_id) { return new ObjectID(player_id); });
    return findPlayers({_id: {$in: ids}}).then(function(players) {
        var findArray = Q.nbind(players.toArray, players);
        return findArray();
    });
};

module.exports.savePlayer = function(player) {
    var updatePlayer = Q.nbind(db.players.update, db.players);
    return updatePlayer({_id: player._id}, player);
};
