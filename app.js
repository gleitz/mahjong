/*global __dirname require */

/*
 * Server-side application for simulating a mahjong game.
 * Usage: node app.js
 * Then visit http://localhost:3000/game
 */
var mahjong = require('./server/mahjong'),
    ami = require('./server/ami'),
    models = require('./server/models'),
    mahjong_util = require('./shared/mahjong_util'),
    shared = require('./shared/shared'),
    db = require('./server/db'),
    express = require('express'),
    swig = require('swig'),
    path = require('path'),
    Q = require('q'),
    argv = require('optimist').argv,
    _ = require('underscore');


var cfg = {
};

var app = express();

app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express['static'](__dirname + '/public'));
    app.use(express.favicon(path.join(__dirname, 'public/img/favicon.ico')));
});

// Swig templating
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
shared.augmentSwig(swig);

//TODO: remove in production
swig.setDefaults({ cache: false });
app.set('view cache', false);

app.use(express.errorHandler({dumpExceptions: true,
                              showStack: true}));

app.get('/', function(req, res){
    res.send('konnichiwa');
});

app.get('/analyze/:id?', function(req, res) {
    var hand = req.params.id,
        result = 'use the form /analyze/1p 123456789s BGR9';
    if (hand) {
        hand = mahjong_util.toTileString(hand);
        // hand = _(hand.split('')).map(function (n) {return parseInt(n, 10);});
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

var renderGame = function(game, req, res) {
    var player = game.players[0];
    var result = ami.getDiscard(player.hand, player.discard),
        obj = result.obj,
        recommended = result.recommended;
    var response = {hand: player.hand,
                    msg: obj.msg,
                    discards: obj.discard,
                    shanten: obj.shanten,
                    new_tile: game.last_tile,
                    tile_width: cfg.tile_width,
                    game_id: game._id,
                    recommended: {discard_tile: [recommended.discard],
                                  discard: mahjong_util.toString(recommended.discard),
                                  score: recommended.score}};
    if (req.param('ajax')) {
        res.json(response);
    } else {
        var mobile = /(iPhone|iPod|Android|webOS)/i.test(req.header('User-Agent', ''));

        cfg = {
            base_path: req.headers['x-script-name'] || '',
            mobile: mobile,
            tile_width: mobile ? 53 : 71 //width + 16
        };

        cfg.js_cfg = JSON.stringify(cfg);
        res.render('game', cfg);
    }
};

var discardTile = function(game, tile) {
    var player = game.players[0];
    tile = parseInt(tile, 10);
    player.discard.push(tile);
    player.hand[tile] -= 1;
    player.last_tile = game.wall.pop();
    player.hand[player.last_tile] += 1;
};

var takeTurn = function(game_id, tile) {
    var deferred = Q.defer();
    if (game_id) {
        models.findOneGame(game_id).then(function(game) {
            if (tile) {
                discardTile(game, tile);
                return models.saveGame(game).then(function(games) {
                    return deferred.resolve(games[0]);
                });
            } else {
                return deferred.resolve(game);
            }
        });
    } else {
        models.createGame([1]).then(function(games) {
            var game = games[0];
            return deferred.resolve(game);
        });
    }
    return deferred.promise;
};

app.get('/game', function(req, res) {
    var tile = req.param('tile', false),
        game_id = req.param('game_id', false);
    takeTurn(game_id, tile).then(function(game) {
        console.log("game is ");
        console.log(game);
        return renderGame(game, req, res);
    }).fail(function(error) {
        console.log("there was an error");
        console.log(error.stack);
    });
});

// Connect to the DB and then start the application
db.init(function(error) {
    if (error) {
        throw error;
    }
    var port = argv.port || 3000;
    app.listen(port);
    console.log("listening on " + port);
});
