/*global console, require, module */

var m_util = require('../shared/mahjong_util');

var vals = m_util.vals;

var shantenSimulation = function (depth, shanten, buffered, singles, pairs) {
    var queue = [],
        seen = {};
    var process = function(depth, buffered, singles, pairs) {
        var copy,
            csingles,
            i,
            discard;
        // Check the cache to ensure that we haven't already
        // calculated this branch
        var key = buffered.slice(0);
        key.push("singles" + singles);
        key.push("pairs" + pairs);
        key.push("depth" + depth);
        key = key.join('.');
        if (seen[key]) {
            return false;
        }
        seen[key] = 1;

        // Ignore branches with greater shanten numbers
        if (depth >= shanten) {
            return false;
        }

        // 3-sets
        for (i = vals.buf_beg; i <= vals.buf_end_no_honors; i++) {
            if (buffered[i] >= 3) {
                // Remove 3-set
                copy = buffered.slice(0);
                copy[i] -= 3;
                // Remove any orphaned single tiles
                csingles = removeSingles(copy, i - 2, i + 2);
                queue.push([depth + 0, copy, singles + csingles, pairs]);

                if ((copy[i - 2] === 0) &&
                    (copy[i - 1] === 0) &&
                    (copy[i + 0] === 0) &&
                    (copy[i + 1] === 0) &&
                    (copy[i + 2] === 0)) {
                    // If there are no neighbor tiles after removing the
                    // 3-set, stop analyzing this branch
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
                copy = buffered.slice(0);
                copy[i] -= 2;
                csingles = removeSingles(copy, i - 2, i + 2);
                queue.push([depth + 1, copy, singles + csingles - 1, pairs]);
                // } else {
                //     for (discard = vals.buf_beg; discard <= vals.buf_end_no_honors; discard++) {
                //         if (discard === i) {
                //             continue;
                //         }

                //         if (buffered[discard] >= 1) {
                //             copy = buffered.slice(0);
                //             copy[i] -= 2;
                //             copy[discard]--;
                //             csingles = removeSingles(copy, i - 2, i + 2);
                //             csingles += removeSingles (copy, discard - 2, discard + 2);
                //             queue.push([depth + 1, copy, singles + csingles, pairs]);
                //         }
                //     }
                // }
            }

            if (buffered[i] >= 2) {
                copy = buffered.slice(0);
                copy[i] -= 2;
                csingles = removeSingles(copy, i - 2, i + 2);
                queue.push([depth, copy, singles + csingles, pairs + 1]);
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
        var singles_left = m_util.sum(buffered) + singles;
        if (pairs == 1 && singles_left == 2) {
            var pos;
            for (pos = vals.buf_beg; pos <= vals.buf_end_no_honors; pos++) {
                if ((buffered[pos] == 1 && buffered[pos+1] == 1) ||
                    (buffered[pos] == 1 && buffered[pos+2] == 1)) {
                    pairs--;
                    singles = singles - 2;
                    break;
                }
            }
        }
        while (pairs > 0 && singles_left > 0) {
            pairs--;
            singles_left--;
            depth++;
        }

        while (pairs > 3) {
            pairs -=3;
            depth += 2;
        }

        if (pairs > 0) {
            if (pairs != 2) {
                return false;
            }
            depth += 0;
        }

        depth += parseInt((singles_left - 1) * 2 / 3, 10);

        if (depth < shanten) {
            // Update the global shanten number
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
    shantenGeneralized = function (hist) {
        var shanten = m_util.sum(hist) * 2 / 3,
            buffered = m_util.translateToBufferedNoHonors(hist),
            honors_result = calcHonors(hist.slice(0)),
            pairs = honors_result[0],
            singles = honors_result[1];
        singles += removeSingles(buffered, vals.buf_beg, vals.buf_end_no_honors);
        return shantenSimulation(0, shanten, buffered, singles, pairs);
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
        // check if there are any isolated
        // single tiles from beg to end
        var count = 0,
            i;

        for (i = beg; i <= end; i++) {
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
    };

module.exports = {
    shantenGeneralized: shantenGeneralized
}
