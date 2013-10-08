/*global describe it */

var mahjong = require('../mahjong');
var assert = require("assert");
var _ = require('underscore');

_.extend(mahjong, mahjong.texting);

describe('translations', function(){
    describe('getColor', function(){
        it('should return the correct color', function(){
            assert.equal(mahjong.getColor(0), 'Pin');
            assert.equal(mahjong.getColor(8), 'Pin');
            assert.equal(mahjong.getColor(9), 'Sou');
            assert.equal(mahjong.getColor(17), 'Sou');
            assert.equal(mahjong.getColor(18), 'Honor');
            assert.equal(mahjong.getColor(26), 'Honor');
            assert.equal(mahjong.getColor(27), null);
            assert.equal(mahjong.getColor(-1), null);
        });
    });
});