/*
 * Utilities for managing a game of mahjong.
 * Note that this specific variant, often played
 * in Japan is called Three-Player mahjong or
 * "Cock-Eyed" mahjong.
 */

var _ = require('underscore');

function debug() {
    false && console.log && console.log.apply(console, arguments);
}

var honors = [
    'E',
    'S',
    'W',
    'N',
    'B',
    'G',
    'R',
    '1',
    '9'
],
    colors = [
        'Pin',
        'Sou',
        'Honor'
    ],
    vals = {
        // id = value + (9 * color);
        // (buffered values have two extra spaces
        // on either side of the pins and sous
        // name     id      buffered
        // pin      00-08   02-10
        // sou      09-17   13-21
        // honors   18-26   24-32
        id_min: 0,
        color_beg: 0,
        pin_beg: 0,
        pin_end: 8,
        sou_beg: 9,
        sou_end: 17,
        color_end: 17,
        honor_beg: 18,
        honor_end: 26,
        id_max: 26,
        count: 26 + 1,
        buf_beg: 2,
        buf_end_no_honors: 21,
        buf_end: 32
    },
    arrayOf = function(n, times) {
        // return an array of the value of 'n' repeated 'times' number of time
        return Array.apply(null, new Array(times)).map(Number.prototype.valueOf,n);
    },
    getColor = function (tile) {
        // return color at specific position
        if (tile < 0) {
            return null;
        }
        tile = tile - (tile % 9);
        tile /= 9;
        return colors[tile];
    },
    getValue =  function (tile) {
        // return value at specific position
        return tile % 9;
    },
    getHonor =  function (tile) {
        // return honor at specific position
        return honors[getValue(tile)];
    },
    isHonor = function (tile) {
        return tile >= vals.honor_beg;
    },
    isPin = function (tile) {
        return tile >= vals.pin_beg && tile <= vals.pin_end;
    },
    isSou = function (tile) {
        return tile >= vals.sou_beg && tile <= vals.sou_end;
    },
    toString = function (tile) {
        if (isHonor(tile)) {
            return getHonor(tile);
        } else {
            return (getValue(tile) + 1) + getColor(tile);
        }
    },
    translateToBufferedNoHonors = function (hist) {
        // Convert a histogram of tiles into the buffered
        // representation which places extra space on the end
        // of the pins and sous
        hist = hist.slice(0, vals.honor_beg);
        hist.splice(vals.honor_beg, 0, 0, 0);
        hist.splice(vals.sou_beg, 0, 0, 0);
        hist.splice(vals.pin_beg, 0, 0, 0);
        return hist;
    },
    translateFromBufferedNoHonors = function (buffered) {
        var hist = buffered.slice(0);
        hist.splice(0, 2);
        hist.splice(9, 2);
        hist.splice(18, 2);
        return hist;
    },
    toHandString = function(hist) {
        // Convert from a histogram
        // [3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,2,0]
        // into a string representation of the hand
        // '111222333p NNN11'
        var i,
            pins = [],
            sous = [],
            s_honors = [],
            handStr = '';
        for (i=0; i<hist.length; i++) {
            for (var j=0; j<hist[i]; j++) {
                if (isPin(i)) {
                    pins.push(getValue(i) + 1);
                } else if (isSou(i)) {
                    sous.push(getValue(i) + 1);
                } else {
                    s_honors.push(i);
                }
            }
        }
        if (pins.length) {
            handStr = handStr + pins.join('') + 'p ';
        }
        if (sous.length) {
            handStr = handStr + sous.join('') + 's ';
        }
        if (s_honors.length) {
            handStr = handStr + _.map(s_honors, function(h) { return getHonor(h); }).join('');
        }
        return handStr;
    },
    toTileString = function(hand) {
        // Convert a hand string, '111222333p NNN11'
        // into a histogram of the hand
        // [3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,2,0]
        var matches = /(\d+[ps])?\s?(\d+[ps])?\s?([ESWNBGR19]+)?/g.exec(hand),
            tiles = arrayOf(0, 27);
        if (!matches || matches.length != 4) {
            return '';
        }
        var pins = matches[1] || '',
            sous = matches[2] || '',
            s_honors = matches[3] || '',
            i, tile;
        if (pins.indexOf('s') != -1 || sous.indexOf('p') != -1) {
            var tmp = pins;
            pins = sous;
            sous = tmp;
        }
        for (i=0; i<pins.length-1; i++) {
            tile = parseInt(pins[i], 10);
            tiles[tile-1] += 1;
        }
        for (i=0; i<sous.length-1; i++) {
            tile = parseInt(sous[i], 10);
            tiles[tile+9-1] += 1;
        }
        for (i=0; i<s_honors.length; i++) {
            tile = honors.indexOf(s_honors[i]);
            tiles[tile+18] += 1;
        }
        return tiles;
    },
    sum = function (arr){
        // Sum the number of tiles in a hand
        for(var s = 0, i = arr.length; i; s += arr[--i]);
        return s;
    };

module.exports = {
    isSou: isSou,
    isPin: isPin,
    honors: honors,
    colors: colors,
    vals: vals,
    getColor: getColor,
    getHonor: getHonor,
    getValue: getValue,
    toString: toString,
    isHonor: isHonor,
    arrayOf: arrayOf,
    translateFromBufferedNoHonors: translateFromBufferedNoHonors,
    translateToBufferedNoHonors: translateToBufferedNoHonors,
    toTileString: toTileString,
    toHandString: toHandString,
    sum: sum,
    debug: debug
};


// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array) {
        return false;
    }

    // compare lengths - can save a lot of time
    if (this.length != array.length) {
        return false;
    }

    for (var i = 0; i < this.length; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].compare(array[i])) {
                return false;
            }
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};
