/*global module process*/

/*
 * Master connection to MongoDB
 */

var MongoClient = require('mongodb').MongoClient;

require('dotenv').config();

module.exports.init = function (callback) {
    var user_and_pass = process.env.DB_USER + ":" + process.env.DB_PASS;
    MongoClient.connect("mongodb://" + user_and_pass + "@localhost:27017/mahjong", function(err, mahjong_db) {
        module.exports.client = mahjong_db;
        module.exports.players = module.exports.client.collection('players');
        module.exports.games = module.exports.client.collection('games');
    });
    MongoClient.connect("mongodb://" + user_and_pass + "@localhost:27017/session", function(err, session_db) {
        module.exports.session = session_db;
        if (typeof(callback) == 'function') {
            callback();
        }
    });
};