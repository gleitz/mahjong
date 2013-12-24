/*
 * Shared functions for use on both the client and the server
 */

// Establish the root object, `window` in the browser, or `exports` on the server.
var root = this;
// Create a safe reference to the mahjong_util object for use below.
var shared = function(obj) {
    if (obj instanceof shared) return obj;
    if (!(this instanceof shared)) return new shared(obj);
    this.sharedwrapped = obj;
};
// Export the shared object for **Node.js**, with
// backwards-compatibility for the old `require()` API. If we're in
// the browser, add `shared` as a global object via a string identifier,
// for Closure Compiler "advanced" mode.
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = shared;
    }
    exports.shared = shared;
} else {
    root.shared = shared;
}

// Import underscore if in **Node.js**
// (import automatically available if in browser)
if (typeof require !== 'undefined') {
    var _ = require('underscore'),
        swig = require('swig');

}

function sum (arr){
    for(var s = 0, i = arr.length; i; s += arr[--i]);
    return s;
}

var last_tile_compiled = swig.compile('<span class="left last-tile"><a data-tile="{{ tile_num }}" class="left tile-holder{% if tile_num == \'hidden\' %} hidden{% endif %}" href="javascript:;"><div class="tile tile-{{ tile_num }}"></div></a></span>'),
    tile_compiled = swig.compile('<a data-tile="{{ tile_num }}" class="left tile-holder{% if tile_num == \'hidden\' %} hidden{% endif %}" href="javascript:;"><div class="tile tile-{{ tile_num }}"></div></a>');

shared.tile = function (input) {
    return tile_compiled({tile_num: input});
};

shared.isComputer = function (player_id) {
    return player_id <= 1;
};

shared.augmentSwig = function(swig) {
    swig.setFilter('tile', shared.tile);
    swig.setFilter('isComputer', shared.isComputer);
    swig.setTag('renderTiles',
                function(str, line, parser, types, stack, options) {
                    return true;
                },
                function(compiler, args, content, parents, options, blockName) {
                    // console.log(result);
                    // return '_output += shared.renderTiles(args[0], args[1], args[2]);'
                },
                false);
};

shared.renderTiles = function(hist, last_tile, is_hidden) {
    var buffer = [],
        last_tile_str,
        i;
    for (i=0; i<hist.length; i++) {
        for (var j=0; j<hist[i]; j++) {
            var hand_tmp = hist.slice(0);
            hand_tmp[i] -= j;
            var tile_num = is_hidden ? 'hidden' : i;
            if (!last_tile_str &&
                 (i === last_tile || sum(hand_tmp.slice(i)) === 1)) {
                // Separate the last discarded tile. If the game has just started
                // then separate the last tile in the hand
                last_tile_str = last_tile_compiled({tile_num: tile_num});
            } else {
                buffer.push(shared.tile(tile_num));
            }
        }
    }
    buffer.push(last_tile_str);
    return buffer.join(' ');
};

shared.renderPlayerTiles = function(game, player_id) {
    _.each(game.seats, function(seat) {
        var is_hidden = seat.player_id != player_id;
        if (typeof game.winner_id === 'number' && game.winner_id == seat.player_id) {
            is_hidden = false;
        }
        seat.rendered_hand = shared.renderTiles(seat.hand,
                                                seat.last_tile,
                                                is_hidden);
        seat.rendered_discard = _.reduce(seat.discard, function(memo, tile) {
            return memo + shared.tile(tile);
        }, '');
    });
};

shared.getSeat = function(seats, player_id) {
    return _.find(seats, function(s) {
        return s.player_id === player_id;
    });
}

shared.getPlayer = function(players, player_id) {
    return _.find(players, function(p) {
        return p._id == player_id;
    });
}
