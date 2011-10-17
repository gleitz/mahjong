var mahjong = require('./mahjong'),
    assert = require('assert');

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
hands = [
	[1,1,1,0,1,2,2,1,0,  0,1,1,1,0,0,0,0,0,  0,0,1,1,0,0,0,0,0]
];
for (i=0; i<hands.length; i++) {
    assert.ok(!mahjong.checkRegularMahjong(hands[i]));
}

*/
//console.log(mahjong.findRegularMahjong([1,1,1,0,3,3,3,3,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0]));
//console.log(mahjong.findRegularMahjongAcc([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  0,0,2,0,0,0,0,0,0], 0, 9));
mahjong.main([1,1,4,0,0,0,0,0,0,  0,1,1,1,0,0,0,0,0,  1,1,1,1,1,0,0,0,0]);
// console.log(mahjong.shantenGeneralized([1,1,0,0,0,0,1,0,0,  1,0,0,1,0,0,1,0,0,  1,1,1,1,1,1,1,1,0]));
// console.log(mahjong.shantenGeneralized([1,1,1,0,0,0,0,0,0,  0,1,1,1,0,1,1,0,0,  0,0,2,0,2,1,1,0,0]));

// console.log(inRange(15, 14,

// console.log(mahjong.translateToBufferedNoHonors([1,1,1,0,0,0,0,0,0,  0,1,1,1,0,1,1,0,0,  0,0,2,0,2,1,1,0,0]));