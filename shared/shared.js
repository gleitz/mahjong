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

var last_tile_compiled = swig.compile('<span class="left" style="margin-left: {{tile_width}}px;"><a data-tile="{{ tile_num }}" class="left tile-holder" href="javascript:;"><div class="tile tile-{{ tile_num }}"></div></a></span>'),
    tile_compiled = swig.compile('<a data-tile="{{ tile_num }}" class="left tile-holder" href="javascript:;"><div class="tile tile-{{ tile_num }}"></div></a>');

shared.tile = function (input) {
    return tile_compiled({tile_num: input});
};

shared.augmentSwig = function(swig) {
    swig.setFilter('tile', shared.tile);
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

shared.renderTiles = function(hist, last_tile, cfg) {
    var buffer = [],
        last_tile_str,
        i;
    for (i=0; i<hist.length; i++) {
        for (var j=0; j<hist[i]; j++) {
            var hand_tmp = hist.slice(0);
            hand_tmp[i] -= j;
            if (!last_tile_str &&
                 (i === last_tile || sum(hand_tmp.slice(i)) === 1)) {
                // Separate the last discarded tile. If the game has just started
                // then separate the last tile in the hand
                last_tile_str = last_tile_compiled({tile_width: cfg.tile_width, tile_num: i});
            } else {
                buffer.push(shared.tile(i));
            }
        }
    }
    buffer.push(last_tile_str);
    return buffer.join(' ');
};

shared.renderPlayerTiles = function(game, cfg) {
    _.each(game.seats, function(seat) {
        seat.rendered_hand = shared.renderTiles(seat.hand, seat.last_tile, cfg);
        seat.rendered_discard = _.reduce(seat.discard, function(memo, tile) {
            return memo + shared.tile(tile);
        }, '');
    });
    console.log(game);
};
