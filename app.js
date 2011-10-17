/*global console: false, require: false, module: false */

"use strict";

var mahjong = require('./mahjong'),
    assert = require('assert'),
    _ = require('underscore');


var app = require('express').createServer();

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
        result += '<br/><br/>probably best to throw the ' + mahjong.toString(mahjong.findBestDiscard(hand, obj.discard));
    }
    res.send(result);
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
console.log(mahjong.main([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  1,1,1,1,1,0,0,0,0]));
console.log(mahjong.findBestDiscard([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  1,1,1,1,1,0,0,0,0]));
// console.log(mahjong.shantenGeneralized([1,1,0,0,0,0,1,0,0,  1,0,0,1,0,0,1,0,0,  1,1,1,1,1,1,1,1,0]));
// console.log(mahjong.shantenGeneralized([1,1,1,0,0,0,0,0,0,  0,1,1,1,0,1,1,0,0,  0,0,2,0,2,1,1,0,0]));

// console.log(inRange(15, 14,

// console.log(mahjong.translateToBufferedNoHonors([1,1,1,0,0,0,0,0,0,  0,1,1,1,0,1,1,0,0,  0,0,2,0,2,1,1,0,0]));