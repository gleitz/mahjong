/*global module*/

/*
 * Master connection to MongoDB
 */

var MongoClient = require('mongodb').MongoClient,
    Server = require('mongodb').Server;

require('dotenv').config()

module.exports.init = function (callback) {
    var mongoClient = new MongoClient(new Server('localhost', 27017));
    mongoClient.open(function(error, mongoClient) {
        module.exports.client = mongoClient.db('mahjong');
        module.exports.client.authenticate(process.env.DB_USER, process.env.DB_PASS, function() {
            module.exports.players = module.exports.client.collection('players');
            module.exports.games = module.exports.client.collection('games');
        })
        module.exports.session = mongoClient.db('session');
        module.exports.session.authenticate(process.env.DB_USER, process.env.DB_PASS)
        if (typeof(callback) == 'function') {
            callback(error);
        }
    });
};
