/*global fs: false, __dirname: false, console: false, require: false, module: false */

"use strict";

var mahjong = require('./mahjong'),
    assert = require('assert'),
    express = require('express'),
    hbs = require('hbs'),
    fs = require('fs'),
    _ = require('underscore');


var app = express.createServer();

app.configure(function(){
  // app.set('views', __dirname + '/views');
  // app.set('view engine', 'hbs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

var templates = {tile: hbs.compile('<a alt="{{i}}" data-tile="{{i}}" class="left" onclick="return false;" href="#"><div class="tile tile-{{i}}"></div></a>')
                };

hbs.registerHelper('render_tiles', function(hist) {
    var buffer = [],
        i;
    for (i=0; i<hist.length; i++) {
        for (var j=0; j<hist[i]; j++) {
            buffer.push(templates.tile({i: i}));
        }
    }
    return buffer.join(' ');
});

hbs.registerHelper('render_score', function(hist, score) {
    var buffer = [],
        i;
    for (i=0; i<hist.length; i++) {
        for (var j=0; j<hist[i]; j++) {
            buffer.push('<div class="left tile-width center">' + score[i] + '</div>');
        }
    }
    return buffer.join('');
});

hbs.registerHelper('render_tile', function(i) {
    return templates.tile({i: i});
});

app.get('/', function(req, res){
    res.send('konnichiwa');
});

app.get('/analyze/:id?', function(req, res) {
    var hand = req.params.id,
        result = 'use the form /analyze/111000000011101100002021100';
    if (hand) {
        hand = _(hand.split('')).map(function (n) {return parseInt(n, 10);});
        var obj = mahjong.main(hand);
        result = 'current hand: ' + mahjong.toHandString(hand);
        result += '<br/><br/>' + obj.msg;
        result += '<br/><br/>probably best to throw the ' + mahjong.toString(mahjong.findBestDiscard(hand, obj.discard).discard);
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
        shanten,
        new_tile;
    if (tile && wall && hand) {
        if (thrown.length) {
            thrown = _(thrown.split(',')).map(function (n) {return parseInt(n, 10);});
        }
        wall = _(wall.split(',')).map(function (n) {return parseInt(n, 10);});
        hand = _(hand.split(',')).map(function (n) {return parseInt(n, 10);});
        if (mahjong.isHonor(tile)) {
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
    var result,
        recommended = mahjong.findBestDiscard(hand, _.union(thrown, obj.discard));
    if (obj.shanten === 0) {
        best_waits = mahjong.findBestDiscardWait(hand);
        if (best_waits.length > 0) {
            inter = _.intersection(best_waits, [recommended.discard]);
            if (inter.length === 0) {
                test_hand = hand.slice(0);
                test_hand[best_waits[0]] -= 1;
                shanten = mahjong.shantenGeneralized(test_hand);
                if (shanten > 0) {
                    best_waits = [recommended.discard];
                }
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
            new_hand[throw_tile] -= 1;
            for (var j=mahjong.vals.id_min; j<=mahjong.vals.id_max; j++) {
                if (throw_tile === j) {
                    continue;
                }
                var new_full_hand = new_hand.slice(0);
                new_full_hand[j] += 1;
                best_waits = mahjong.findBestDiscardWait(new_full_hand);
                if (best_waits.length === num_waits) {
                    if (_.indexOf(best_discard, throw_tile) === -1) {
                        best_discard.push(throw_tile);
                    }
                } else if (best_waits.length > num_waits) {
                    best_discard = [throw_tile];
                    num_waits = best_waits.length;
                }
            }
        }
        if (best_discard.length > 0) {
            inter = _.intersection(best_discard, [recommended.discard]);
            if (inter.length === 0) {
                test_hand = hand.slice(0);
                test_hand[best_discard[0]] -= 1;
                shanten = mahjong.shantenGeneralized(test_hand);
                if (shanten > 1) {
                    best_discard = [recommended.discard];
                }
            }
        } else {
            best_discard = [recommended.discard];
        }
        //TODO: take the one with the lowest score
        recommended.discard = best_discard[0];
    }
    var response = {layout : 'index',
                    hand: hand,
                    wall: wall,
                    thrown: thrown,
                    msg: obj.msg,
                    discards: obj.discard,
                    best_waits: mahjong.findBestDiscardWait(hand),
                    shanten: obj.shanten,
                    new_tile: new_tile,
                    recommended: {discard_tile: [recommended.discard],
                                  discard: mahjong.toString(recommended.discard),
                                  score: recommended.score}};
    if (req.param('ajax')) {
        res.json(response);
    } else {
        fs.readFile(__dirname + '/views/index.html', 'utf8', function(err, text){
            res.send(text);
        });
    }
});

app.listen(3000);

/*
var hands = [
    [0,0,0,1,2,3,2,1,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0],
	[1,1,1,0,1,2,2,1,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0],
	[0,0,0,3,3,1,1,1,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0],
	[3,0,0,0,1,1,1,0,0,  0,0,2,0,0,0,0,0,0,  0,0,3,3,0,0,0,0,0],
	[0,0,2,1,1,1,2,2,2,  0,0,0,0,0,0,0,0,0,  0,0,0,0,3,0,0,0,0]];
for (var i=0; i<hands.length; i++) {
    assert.ok(mahjong.checkRegularMahjong(hands[i]), hands[i]);
}

var hands = [
	[1,1,1,0,1,2,2,1,0,  0,1,1,1,0,0,0,0,0,  0,0,1,1,0,0,0,0,0],
	[1,1,1,1,1,0,0,0,0,  0,1,1,1,1,1,1,1,0,  0,0,2,0,0,0,0,0,0]
];
for (i=0; i<hands.length; i++) {
    assert.ok(!mahjong.checkRegularMahjong(hands[i]));
}
*/
//console.log(mahjong.checkRegularMahjong([1,1,1,1,1,0,0,0,0,  0,1,1,1,1,1,1,1,0,  0,0,2,0,0,0,0,0,0]));
//console.log(mahjong.findRegularMahjong([1,1,1,0,3,3,3,3,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0]));
//console.log(mahjong.findRegularMahjongAcc([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0], 0, 9));
// console.log(mahjong.main([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  1,1,1,1,1,0,0,0,0]));
// console.log(mahjong.findBestDiscard([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  1,1,1,1,1,0,0,0,0]));
//console.log(mahjong.shantenGeneralized([1,1,0,0,0,0,1,0,0,  1,0,0,1,0,0,1,0,0,  1,1,1,1,1,1,1,1,0]));
// console.log(mahjong.shantenGeneralized([1,1,1,0,0,0,0,0,0,  0,1,1,1,0,1,1,0,0,  0,0,2,0,2,1,1,0,0]));

// console.log(inRange(15, 14,

// console.log(mahjong.translateToBufferedNoHonors([1,1,1,0,0,0,0,0,0,  0,1,1,1,0,1,1,0,0,  0,0,2,0,2,1,1,0,0]));