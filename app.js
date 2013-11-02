/*global __dirname require */

/*
 * Server-side application for simulating a mahjong game.
 * Usage: node app.js
 * Then visit http://localhost:3000/game
 */
var mahjong = require('./mahjong'),
    shanten = require('./shanten'),
    mahjong_util = require('./mahjong_util'),
    shared = require('./public/js/src/shared'),
    express = require('express'),
    swig = require('swig'),
    path = require('path'),
    fs = require('fs'),
    _ = require('underscore');


var cfg = {
};

var app = express();

app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));
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
        hand = mahjong_util.toTileString(hand)
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

app.get('/game', function(req, res) {
    var tile = req.param('tile', false),
        wall = req.param('wall'),
        hand = req.param('hand'),
        thrown = req.param('thrown', []),
        i,
        inter,
        best_waits,
        test_hand,
        shanten_number,
        new_tile;
    if (tile && wall && hand) {
        tile = parseInt(tile, 10);
        if (thrown.length) {
            thrown = _(thrown.split(',')).map(function (n) {return parseInt(n, 10);});
        }
        wall = _(wall.split(',')).map(function (n) {return parseInt(n, 10);});
        hand = _(hand.split(',')).map(function (n) {return parseInt(n, 10);});
        if (mahjong_util.isHonor(tile)) {
            thrown.push(tile);
        }
        hand[tile] -= 1;
        new_tile = wall.pop();
        hand[new_tile] += 1;
    } else {
        var hand_obj = mahjong.generateHands(1);
        hand = hand_obj.hands[0];
        wall = hand_obj.wall;
    }
    var obj = mahjong.main(hand.slice(0));
    var recommended = mahjong.findBestDiscard(hand, _.union(thrown, obj.discard));
    if (obj.shanten === 0) {
        best_waits = mahjong.findBestDiscardWait(hand);
        if (best_waits.length > 0) {
            inter = _.intersection(best_waits, [recommended.discard]);
            if (inter.length === 0) {
                test_hand = hand.slice(0);
                test_hand[best_waits[0]] -= 1;
                shanten_number = shanten.shantenGeneralized(test_hand);
                if (shanten_number > 0) {
                    best_waits = [recommended.discard];
                }
            } else {
                best_waits = inter;
            }
        } else {
            best_waits = [recommended.discard];
        }
        //TODO: take the one with the lowest score
        recommended.discard = best_waits[0];
    } else if (obj.shanten === 1) {
        var best_discard = [],
            num_waits = 0;
        for (i=0; i<obj.discard.length; i++) {
            var throw_tile = obj.discard[i];
            var new_hand = hand.slice(0);
            var total_waits = 0;
            new_hand[throw_tile] -= 1;
            for (var j=mahjong_util.vals.id_min; j<=mahjong_util.vals.id_max; j++) {
                if (throw_tile === j) {
                    continue;
                }
                var new_full_hand = new_hand.slice(0);
                new_full_hand[j] += 1;
                best_waits = mahjong.findBestDiscardWait(new_full_hand);
                total_waits += best_waits;
            }
            if (total_waits.length === num_waits) {
                if (_.indexOf(best_discard, throw_tile) === -1) {
                    best_discard.push(throw_tile);
                }
            } else if (total_waits.length > num_waits) {
                best_discard = [throw_tile];
                num_waits = total_waits.length;
            }
        }
        if (best_discard.length > 0) {
            inter = _.intersection(best_discard, [recommended.discard]);
            if (inter.length === 0) {
                test_hand = hand.slice(0);
                test_hand[best_discard[0]] -= 1;
                shanten_number = shanten.shantenGeneralized(test_hand);
                if (shanten_number > 1) {
                    best_discard = [recommended.discard];
                }
            }
        } else {
            best_discard = [recommended.discard];
        }
        //TODO: take the one with the lowest score
        recommended.discard = best_discard[0];
    }
    var response = {layout: 'index',
                    hand: hand,
                    wall: wall,
                    thrown: thrown,
                    msg: obj.msg,
                    discards: obj.discard,
                    best_waits: mahjong.findBestDiscardWait(hand),
                    shanten: obj.shanten,
                    new_tile: new_tile,
                    tile_width: cfg.tile_width,
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


        fs.readFile(__dirname + '/views/partials/board.html', 'utf8', function(err, board){
            cfg.board = board;
            cfg.js_cfg = JSON.stringify(cfg);
            res.render('game', cfg);
        });
    }
});

var port = 3000;
app.listen(port);
console.log("listening on " + port);
