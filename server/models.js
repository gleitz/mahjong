/*global require module */

/*
 * Models for mahjong players, hands, and game
 */

var db = require('./db'),
    ObjectID = require('mongodb').ObjectID,
    mahjong = require('./mahjong'),
    Q = require('q');

// TODO: disable in production
Q.longStackSupport = true;

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
    return insertGame(game);
};

module.exports.findOneGame = function(game_id) {
    var findOneGame = Q.nbind(db.games.findOne, db.games);
    return findOneGame({_id: new ObjectID(game_id)});
};

module.exports.saveGame = function(game) {
    var updateGame = Q.nbind(db.games.update, db.games);
    return updateGame({_id: game._id}, game);
};
