/*global console: false, require: false, module: false */

var util = require('util');
var _ = require('underscore');

var honors = [
    'East',
    'South',
    'West',
    'North',
    'White',
    'Green',
    'Red',
    '1Man',
    '9Man'
],
    colors = [
        'Pin',
        'Sou',
        'Honor'
    ],
    vals = {
        // id = value + (9 * color);
        // name     id      buffered
        // pin		00-08	02-10
        // sou		09-17	13-21
        // honors	18-26	24-32
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

    getColor = function (tile) {
        tile = tile - (tile % 9);
        tile /= 9;
        return colors[tile];
        },
getValue =  function (tile) {
    return tile % 9;
    },
getHonor =  function (tile) {
    return honors[getValue(tile)];
    },
isHonor = function (tile) {
    return tile >= vals.honor_beg;
},
toString = function (tile) {

    if (isHonor(tile)) {
        return getHonor(tile);
    } else {
        return (getValue(tile) + 1) + getColor(tile);
    }
},
checkRegularMahjongNoPairHonor = function (hist, beg, end) {
    /*
             * for honors, check triplets only
             */
    for (var i = beg; i <= end; i++) {
        if ((hist[i] % 3) !== 0) {
            return false;
        }
    }
    return true;
},
sum = function (arr){
    for(var s = 0, i = arr.length; i; s += arr[--i]);
    return s;
},
    checkRegularMahjongNoPairColor = function (init_hist, init_beg, init_end) {
        var queue = [],
        process = function (hist, index, beg, end) {
            if (sum(hist.slice(beg, end+1)) === 0) {
                return true;
            }
            for (var i = beg; i <= end; i++) {
                if (sum(hist.slice(index, i)) > 0) {
                    return false;
                }
                var count = hist[i],
                    copy;
                if (count > 0) {
                    if (i + 2 <= end) {
                        if (hist[i+1] > 0 && hist[i+2] > 0) {
                            copy = hist.slice(0);
                            copy[i] -= 1;
                            copy[i+1] -= 1;
                            copy[i+2] -= 1;
                            queue.push([copy, index, i, end]);
                        }
                    }
                }
                if (count >= 3) {
                    copy = hist.slice(0);
                    copy[i] -= 3;
                    queue.push([copy, index, i, end]);
                }
            }
            return false;
        };
        queue.push([init_hist, init_beg, init_beg, init_end]);
        while (queue.length > 0) {
            var cur_item = queue[0],
                hist = cur_item[0],
                index = cur_item[1],
                beg = cur_item[2],
                end = cur_item[3];
            var worked = process(hist, index, beg, end);
            if (worked) {
                return true;
            }
            queue.shift();
        }
        return false;
        },
    checkRegularMahjongNoPair = function (hist) {
        return checkRegularMahjongNoPairHonor(hist, vals.honor_beg, vals.honor_end) &&
            checkRegularMahjongNoPairColor(hist, vals.pin_beg, vals.pin_end) &&
            checkRegularMahjongNoPairColor(hist, vals.sou_beg, vals.sou_end);
        },
    checkRegularMahjong = function (hist) {
        if (sum(hist) !== 14) {
            throw "not enough tiles in hand";
        }
            /*
             * enumerate through all possible pairs
             */
            for (var i = 0; i < vals.count; i++) {
                if (hist[i] >= 2) {
                    hist[i] -= 2;
                    var pass = checkRegularMahjongNoPair(hist);
                    hist[i] += 2;

                    if (pass) {
                        return true;
                    }
                }
            }
            return false;
        },

    findRegularMahjongAcc = function (hist, beg, end) {
        var mjs = [],
            queue = [],
            valid = false;
        var process = function(hist, sets, index, beg, end) {
            var copy;
            if (sum(hist.slice(beg, end+1)) === 0) {
                mjs.push(sets);
                return true;
            }
            for (var i = beg; i <= end; i++) {
                if (sum(hist.slice(index, i)) > 0) {
                    return false;
                }
                var count = hist[i];
                if (count > 0) {
                    if (i + 2 <= end) {
                        if (hist[i+1] > 0 &&
                            hist[i+2] > 0) {
                            copy = hist.slice(0);
                            copy[i] -= 1;
                            copy[i+1] -= 1;
                            copy[i+2] -= 1;
                            var new_sets = sets.slice(0);
                            new_sets.push([i, i+1, i+2]);
                            queue.push([copy, new_sets, i, beg, end]);
                        }
                    }
                }
                if (count >= 3) {
                    copy = hist.slice(0);
                    copy[i] -= 3;
                    sets.push([i, i, i]);
                    queue.push([copy, sets, i, beg, end]);
                }
            }
            return false;
        };
        queue.push([hist, [], beg, beg, end]);
        while (queue.length > 0) {
            var cur_item = queue[0],
            sets = cur_item[1],
            index = cur_item[2];
            hist = cur_item[0];
            beg = cur_item[3];
            end = cur_item[4];
            if (process(hist, sets, index, beg, end)) {
                valid = true;
            }
            queue.shift();
        }
        return [mjs, valid];
    },
    findHonors = function (hist) {
        hist = hist.slice(0);
        var sets = [];
        for (var i = vals.honor_beg; i <= vals.honor_end; i++) {
            if (hist[i] >= 3) {
                sets.push([i, i, i]);
                hist[i] -= 3;
            }
        }
        if (sum(hist.slice(vals.honor_beg, vals.honor_end + 1)) === 0) {
            return [[sets], true];
        }
        return [[sets], false];
    },
    findRegularMahjong = function (hist) {
            /*
             * try all pairs
             */
            for (var i = vals.id_min; i <= vals.id_max; i++) {
                if (hist[i] < 2) {
                    continue;
                }
                var pair = i;
                hist[i] -= 2;
                var honor_result = findHonors(hist);
                var pin_result = findRegularMahjongAcc(hist, vals.pin_beg, vals.pin_end);
                var sou_result = findRegularMahjongAcc(hist, vals.sou_beg, vals.sou_end);
                if (honor_result[1] && pin_result[1] && sou_result[1]) {
                    var hand = [];
                    if (honor_result[0].length) {
                        for (i=0; i<honor_result[0][0].length; i++) {
                            hand.push(honor_result[0][0][i]);
                        }
                    }
                    if (pin_result[0].length) {
                        for (i=0; i<pin_result[0][0].length; i++) {
                            hand.push(pin_result[0][0][i]);
                        }
                    }
                    if (sou_result[0].length) {
                        for (i=0; i<sou_result[0][0].length; i++) {
                            hand.push(sou_result[0][0][i]);
                        }
                    }
                    hand.push([pair, pair]);
                    return hand;
                }
                hist[i] += 2;
            }
        return false;
    },
    calcHonors = function (hist) {
        var singles = 0,
            pairs = 0;

            for (var i = vals.honor_beg; i <= vals.honor_end; i++) {
                // always remove triplets
                if (hist[i] >= 3) {
                    hist[i] -= 3;
                }

                // extract pairs
                if (hist[i] === 2) {
                    hist[i] = 0;
                    pairs += 1;
                }

                // remove singles
                else if (hist[i] === 1) {
                    hist[i] = 0;
                    singles += 1;
                }
            }
    return [pairs, singles];
        },
    removeSingles = function (buffered, beg, end) {
        var count = 0;

            for (var i = beg; i <= end; i++) {
                if (buffered[i] !== 1) {
                    continue;
                }

                if (buffered[i - 1] > 0) {
                    continue;
                }

                if (buffered[i - 2] > 0) {
                    continue;
                }

                if (buffered[i + 1] > 0) {
                    continue;
                }

                if (buffered[i + 2] > 0) {
                    continue;
                }

                buffered[i]--;
                count++;
            }

            return count;
        },
shantenSimulation = function (depth, shanten, buffered, singles, pairs) {
    var mjs = [],
    queue = [],
    valid = false,
    seen = {};
    var process = function(depth, buffered, singles, pairs) {
        var key = buffered.slice(0);
        key.push(singles);
        key.push(pairs);
        key.push(depth);
        key = key.join('.');
        if (seen[key]) {
            return false;
        }
        seen[key] = 1;
        var copy,
            csingles,
            i,
            discard;
        if (depth >= shanten) {
            return false;
        }
        for (i = vals.buf_beg; i <= vals.buf_end_no_honors; i++) {
            if (buffered[i] >= 3) {
                copy = buffered.slice(0);
                copy[i] -= 3;
                csingles = removeSingles(copy, i - 2, i + 2);
                queue.push([depth + 0, copy, singles + csingles, pairs]);

                if ((copy[i - 2] === 0) &&
                    (copy[i - 1] === 0) &&
                    (copy[i + 0] === 0) &&
                    (copy[i + 1] === 0) &&
                    (copy[i + 2] === 0)) {
                    return false;
                }
            }

            if ((buffered[i + 0] >= 1) &&
                (buffered[i + 1] >= 1) &&
                (buffered[i + 2] >= 1)) {

                copy = buffered.slice(0);
                copy[i + 0]--;
                copy[i + 1]--;
                copy[i + 2]--;
                csingles = removeSingles(copy, i - 2, i + 4);
                queue.push([depth + 0, copy, singles + csingles, pairs]);

                if ((copy[i - 2] === 0) &&
                    (copy[i - 1] === 0) &&
                    (copy[i + 0] === 0) &&
                    (copy[i + 1] === 0) &&
                    (copy[i + 2] === 0) &&
                    (copy[i + 3] === 0) &&
                    (copy[i + 4] === 0)) {
                    return false;
                }
            }
        }


                /*
             * 2-sets
             */
        for (i = vals.buf_beg; i <= vals.buf_end_no_honors; i++) {
            if (buffered[i] >= 2) {
                if (singles > 0) {
                    copy = buffered.slice(0);
                    copy[i] -= 2;
                    csingles = removeSingles(copy, i - 2, i + 2);
                    queue.push([depth + 1, copy, singles + csingles - 1, pairs]);
                } else {
                    for (discard = vals.buf_beg; discard <= vals.buf_end_no_honors; discard++) {
                        if (discard === i) {
                            continue;
                        }

                        if (buffered[discard] >= 1) {
                            copy = buffered.slice(0);
                            copy[i] -= 2;
                            copy[discard]--;
                            csingles = removeSingles(copy, i - 2, i + 2);
                            csingles += removeSingles (copy, discard - 2, discard + 2);
                            queue.push([depth + 1, copy, singles + csingles, pairs]);
                        }
                    }
                }
            }

            if ((buffered[i + 0] >= 1) && (buffered[i + 1] >= 1)) {
                if (singles > 0) {
                    copy = buffered.slice(0);
                    copy[i + 0] -= 1;
                    copy[i + 1] -= 1;
                    csingles = removeSingles (copy, i - 2, i + 3);
                    queue.push([depth + 1, copy, singles + csingles - 1, pairs]);
                } else {
                    for (discard = vals.buf_beg; discard <= vals.buf_end_no_honors; discard++) {
                        if (discard === i + 0) {
                            continue;
                        }
                        if (discard === i + 1) {
                            continue;
                        }

                        if (buffered[discard] >= 1) {
                            copy = buffered.slice(0);
                            copy[i + 0] -= 1;
                            copy[i + 1] -= 1;
                            copy[discard]--;
                            csingles = removeSingles(copy, i - 2, i + 3);
                            csingles += removeSingles(copy, discard - 2, discard + 2);
                            queue.push([depth + 1, copy, singles + csingles, pairs]);
                        }
                    }
                }
            }

            if ((buffered[i + 0] >= 1) && (buffered[i + 2] >= 1)) {
                if (singles > 0) {
                    copy = buffered.slice(0);
                    copy[i + 0] -= 1;
                    copy[i + 2] -= 1;
                    csingles = removeSingles(copy, i - 2, i + 4);
                    queue.push([depth + 1, copy, singles + csingles - 1, pairs]);
                } else {
                    for (discard = vals.buf_beg; discard <= vals.buf_end_no_honors; discard++) {
                        if (discard === i + 0) {
                            continue;
                        }
                        if (discard === i + 2) {
                            continue;
                        }

                        if (buffered[discard] >= 1) {
                            copy = buffered.slice(0);
                            copy[i + 0] -= 1;
                            copy[i + 2] -= 1;
                            copy[discard]--;
                            csingles = removeSingles(copy, i - 2, i + 4);
                            csingles += removeSingles(copy, discard - 2, discard + 2);
                            queue.push([depth + 1, copy, singles + csingles, pairs]);
                        }
                    }
                }
            }
        }
        /*
             * direct pairs
             */
        if (pairs > 0) {
            if (singles > 0) { // >1?
                queue.push([depth + 1, buffered, singles - 1, pairs - 1]);
                return false;
            } else {
                var found = false;
                for (discard = vals.buf_beg; discard <= vals.buf_end_no_honors; discard++) {
                    if (buffered[discard] >= 1) {
                        copy = buffered.slice(0);
                        copy[discard]--;
                        csingles = removeSingles(copy, discard - 2, discard + 2);
                        queue.push([depth + 1, copy, singles + csingles, pairs - 1]);
                        found = true;
                    }
                }
                if (found) {
                    return false;
                }
            }
            if (pairs === 0) {
                singles += 2 * pairs;
            } else {
                queue.push([depth, buffered, singles + 2, pairs - 1]);
                return false;
            }
            // return false;
        }
        var singles_left = sum(buffered) + singles;
        depth += parseInt((singles_left - 1) * 2 / 3, 10);

        if (depth < shanten) {
            shanten = depth;
        }
    };
    queue.push([depth, buffered, singles, pairs]);
    while (queue.length > 0) {
        var cur_item = queue[0];
        process(cur_item[0], cur_item[1], cur_item[2], cur_item[3]);
        queue.shift();
    }
    return shanten;
},
    translateToBufferedNoHonors = function (hist) {
        hist = hist.slice(0, vals.honor_beg);
        hist.splice(vals.honor_beg, 0, 0, 0);
        hist.splice(vals.sou_beg, 0, 0, 0);
        hist.splice(vals.pin_beg, 0, 0, 0);
        return hist;
    },
shantenGeneralized = function (hist) {
    var shanten = sum(hist) * 2 / 3,
        buffered = translateToBufferedNoHonors(hist),
        honors_result = calcHonors(hist.slice(0)),
        pairs = honors_result[0],
        singles = honors_result[1];
    singles += removeSingles(buffered, vals.buf_beg, vals.buf_end_no_honors);
    return shantenSimulation(0, shanten, buffered, singles, pairs);
},
toHandString = function(hist) {
    var i,
        tiles = [];
    for (i=0; i<hist.length; i++) {
        for (var j=0; j<hist[i]; j++) {
            tiles.push(toString(i));
        }
    }
    return tiles.join(', ');
},
    toTileSetString = function (tiles) {
        var conv = [],
            buffer = '',
            i;
        for (i=0; i<tiles.length; i++) {
            var tile = tiles[i],
                data = {color: getColor(tile),
                        honor: getHonor(tile),
                        value: getValue(tile) + 1,
                        number: i};
            conv.push(data);
        }
        var first = conv[0];
        if (first.color !== 'Honor') {
            for (i=0; i<conv.length; i++) {
                buffer += conv[i].value;
            }
            buffer += first.color.substring(0,1);
            return buffer;
        } else {
            for (i=0; i<conv.length; i++) {
                buffer += conv[i].honor.substring(0,1);
            }
            return buffer;
        }
    },
main = function (hist) {
    var return_str = '',
        i,
        discard = [],
        best = 10;
    if (sum(hist) !== 14) {
        return {msg: "must submit 14 tiles (there were " + sum(hist) + ")",
                discard: []};
        // throw new Error("not enough tiles");
    }
    if (checkRegularMahjong(hist)) {
        return_str += ("Tsumo! You've got a mahjong");
        // var buffer = [],
            // mj = findRegularMahjong(hist);
        // for (i=0; i<mj.length; i++) {
            // buffer.push(toTileSetString(mj[i]));
        // }
        // return_str += buffer.join(', ');
    } else {
        for (i=vals.id_min; i<= vals.id_max; i++) {
            if (hist[i] > 0) {
                var new_hist = hist.slice(0);
                new_hist[i]--;
                var shanten = shantenGeneralized(new_hist);
                if (shanten < best) {
                    best = shanten;
                    discard = [i];
                } else if (shanten === best) {
                    discard.push(i);
                }
            }
        }
        // return_str += "throwing " + _.map(discard, toString).join(',') + " produces shanten of " + best;
    }
    return {msg: return_str,
            discard: discard,
            shanten: best};
},
    addStreetScore = function (score, hist, beg, end)
        {
            var i;
            for (i = beg; i <= end - 1; i++) {
                score[i] += hist[i + 1] * 100;
            }

            for (i = beg; i <= end - 2; i++) {
                score[i] += hist[i + 2] * 10;
            }

            for (i = beg; i <= end - 3; i++) {
                score[i] += hist[i + 3] * 5;
            }

            for (i = beg + 1; i <= end; i++) {
                score[i] += hist[i - 1] * 100;
            }

            for (i = beg + 2; i <= end; i++) {
                score[i] += hist[i - 2] * 10;
            }

            for (i = beg + 3; i <= end; i++) {
                score[i] += hist[i - 3] * 5;
            }

            return score;
        },
findBestDiscard = function (hist, worst_tiles) {
            /*
             * score by combination with other tiles
             */
    var score = [
        0,1,2,3,4,3,2,1,0, // central tiles are more valuable
        0,1,2,3,4,3,2,1,0,
        5,-1,-1,5, // winds are more valuable
        5,5,5, // honors
        -1, -1],
        i;
    for (i = vals.id_min; i <= vals.id_max; i++) {
        var add = 1000 * (hist[i] - 1);
        score[i] += add;
    }

    score = addStreetScore (score, hist, vals.pin_beg, vals.pin_end);
    score = addStreetScore (score, hist, vals.sou_beg, vals.sou_end);
    if (worst_tiles) {
        for (i=0; i<worst_tiles.length; i++) {
            score[worst_tiles[i]] -= 1000;
        }
    }

            /*
             * select worst tile
             */
            var bestI = 0;
            var bestV = 1000000;
            for (i = vals.id_min; i <= vals.id_max; i++) {
                if (hist[i] > 0) {
                    var v = score[i];
                    if (v < bestV) {
                        bestV = v;
                        bestI = i;
                    }
                }
            }
            return {discard: bestI,
                    score: score};
        },
generateWall = function() {
    var wall = [];
    for (var plr = 0; plr < 4; plr++) {
        for (var i = vals.id_min; i <= vals.id_max; i++) {
            wall.push(i);
        }
    }
    wall.sort(function() {return 0.5 - Math.random();});
    return wall;
}, generateHand = function() {
    var hand = [];
    for (var i = vals.id_min; i<=vals.id_max; i++) {
        hand.push(0);
    }
    return hand.slice(0);
},
generateHands = function (num) {
    var wall = generateWall();
    var hands = [];
    for (var plr = 0; plr < num; plr++) {
        hands[plr] = generateHand();
        for (var i = 0; i <= 13; i++) { //TODO: switch to < 13 when actually dealing
            hands[plr][wall.pop()] += 1;
        }
    }
    return {hands: hands,
            wall: wall};
},
getWaits = function (hist) {
    var count = sum(hist),
        i,
        waits = [];
    if (count !== 13) {
        throw new Error("invalid tile count (" + count + ")");
    }
    for (i=vals.id_min; i<=vals.id_max; i++) {
        var hand = hist.slice(0);
        hand[i] += 1;
        if (checkRegularMahjong(hand)) {
            for (var j=0; j<(4 - hist[i]); j++) {
                waits.push(i);
            }
        }
    }
    return waits;
},
findBestDiscardWait = function (hist) {
    var waits = 0,
        i,
        discard = [];
    for (i=vals.id_min; i<=vals.id_max; i++) {
        if (hist[i] > 0) {
            var hand = hist.slice(0);
                hand[i] -= 1;
            var num_waits = getWaits(hand);
            if (num_waits.length === 0) {
                continue;
            }
            if (num_waits.length === waits) {
                discard.push(i);
            } else if (num_waits.length > waits) {
                waits = num_waits.length;
                discard = [];
                discard.push(i);
            }
        }
    }
    return discard;
};

module.exports = {
    honors: honors,
    colors: colors,
    vals: vals,
    getColor: getColor,
    getHonor: getHonor,
    getValue: getValue,
    checkRegularMahjong: checkRegularMahjong,
    findRegularMahjong: findRegularMahjong,
    findRegularMahjongAcc: findRegularMahjongAcc,
    shantenGeneralized: shantenGeneralized,
    translateToBufferedNoHonors: translateToBufferedNoHonors,
    main: main,
    toString: toString,
    toTileSetString: toTileSetString,
    toHandString: toHandString,
    findBestDiscard: findBestDiscard,
    generateHands: generateHands,
    generateHand: generateHand,
    getWaits: getWaits,
    findBestDiscardWait: findBestDiscardWait,
    isHonor: isHonor
};