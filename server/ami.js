/*global require module */

/*
 * AMI: Artificial Mahjong Intelligence
 */

var mahjong = require('./mahjong'),
    mahjong_util = require('../shared/mahjong_util'),
    Q = require('q'),
    shanten = require('./shanten'),
    _ = require('underscore');

module.exports.checkMahjong = function(hand, callback) {
    //TODO(gleitz): check how to create callback
    // perhaps use setTimeout / nextTick
    var deferred = Q.defer();
    var is_mahjong = mahjong.checkRegularMahjong(hand);
    deferred.resolve(is_mahjong);
    return deferred.promise.nodeify(callback)
};

module.exports.getDiscard = function(hand, thrown, callback) {
    var deferred = Q.defer();
    setTimeout(function() {
        var obj = mahjong.main(hand.slice(0)),
            recommended = mahjong.findBestDiscard(hand, _.union(thrown, obj.discard)),
            i,
            inter,
            best_waits,
            test_hand,
            shanten_number;
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
                    total_waits += best_waits.length;
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
        deferred.resolve({obj: obj,
                          recommended: recommended});
    }, 0);
    return deferred.promise.nodeify(callback)
};

module.exports.shouldPon = function(seat, tile) {
    // if (module.exports.canPon(seat, tile)) {
        // return true;
    // }
    if (_.contains([21, 22, 23, 24], tile)) {
        return true;
    }
    return false;
};
module.exports.canRon = function(hand, tile) {
    var new_hand = hand.slice(0);
    new_hand[tile] += 1;
    return mahjong.checkRegularMahjong(new_hand);
};
module.exports.canPon = function(seat, tile) {
    if (!_.contains(seat.side, tile) && seat.hand[tile] >= 2) {
        return true;
    }
    return false;
};
module.exports.canKan = function(seat, tile) {
    return false;
    //TODO(gleitz): fill this in
    if (!_.contains(seat.side, tile) && seat.hand[tile] >= 2) {
        return true;
    }
    return false;
};
