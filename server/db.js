/*global module process*/

/*
 * Master connection to MongoDB
 */

var MongoClient = require('mongodb').MongoClient;

require('dotenv').config();

module.exports.init = function (callback) {
//    var user_and_pass = process.env.DB_USER + ":" + process.env.DB_PASS;
    MongoClient.connect("mongodb://localhost:27027", function(err, client) {
        module.exports.client = client.db('mahjong');
        module.exports.players = module.exports.client.collection('players');
        module.exports.games = module.exports.client.collection('games');
        module.exports.session = client.db('session');

        if (typeof(callback) == 'function') {
          callback();
        }
    });
}
