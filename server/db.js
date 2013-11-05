/*global module*/

/*
 * Master connection to MongoDB
 */

var MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server;


module.exports.init = function (callback) {
    var mongoClient = new MongoClient(new Server('localhost', 27017));
    mongoClient.open(function(error, mongoClient) {
        module.exports.client = mongoClient.db('mahjong');
        module.exports.players = module.exports.client.collection('players');
        module.exports.game = module.exports.client.collection('game');
        if (typeof(callback) == 'function') {
            callback(error);
        }
    });
};
