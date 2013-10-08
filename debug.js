/*global __dirname: false, console: false, require: false, module: false */

"use strict";

var mahjong = require('./mahjong'),
    assert = require('assert'),
    express = require('express'),
    hbs = require('hbs'),
    _ = require('underscore');
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
console.log(mahjong.checkRegularMahjong([1,1,1,1,1,0,0,0,0,  0,1,1,1,1,1,1,1,0,  0,0,2,0,0,0,0,0,0]));
// console.log(mahjong.findRegularMahjong([1,1,1,0,3,3,3,3,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0]));
//console.log(mahjong.findRegularMahjongAcc([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0], 0, 9));
// console.log(mahjong.main([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  1,1,1,1,1,0,0,0,0]));
// console.log(mahjong.findBestDiscard([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  1,1,1,1,1,0,0,0,0]));
// console.log(mahjong.shantenGeneralized([1,1,0,0,0,0,1,0,0,  1,0,0,1,0,0,1,0,0,  1,1,1,1,1,1,1,1,0]));
// console.log(mahjong.shantenGeneralized([0,1,0,0,0,0,0,0,0,2,1,2,1,3,3,1,0,0,0,0,0,0,0,0,0,0,0]));
// console.log(mahjong.findBestDiscard([1,0,0,1,2,0,1,1,0,0,1,0,0,0,1,0,0,0,0,0,1,0,1,1,1,1,1]));
// console.log(mahjong.main([0,0,0,0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,2,0,0,2,3,1,0,0,0]));
// console.log(mahjong.shantenGeneralized([0,0,0,0,0,0,0,0,0,1,2,2,1,0,0,0,0,0,2,0,0,2,3,0,0,0,0]));
// console.log(mahjong.shantenGeneralized([0,0,1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,3,0,0,0,0,0]));
console.log(mahjong.shantenGeneralized([0,1,1,0,0,2,2,2,0,0,0,0,1,0,0,0,0,0,0,0,0,3,0,0,2,0,0]));
// console.log(inRange(15, 14,

// console.log(mahjong.translateToBufferedNoHonors([1,1,1,0,0,0,0,0,0,  0,1,1,1,0,1,1,0,0,  0,0,2,0,2,1,1,0,0]));