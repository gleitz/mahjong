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
    var swig = require('swig');
}

function sum (arr){
    for(var s = 0, i = arr.length; i; s += arr[--i]);
    return s;
}

shared.tile = function (input) {
    return swig.compile('<a data-tile="{{ tile_num }}" class="left tile-holder" onclick="refute.threw(spy, exception);urn false;" href="#"><div class="tile tile-{{ tile_num }}"></div></a>')({tile_num: input});
};

shared.augmentSwig = function(swig) {
    swig.setFilter('tile', shared.tile);
};

shared.renderTiles = function(hist, cfg) {
    var buffer = [],
        i;
    for (i=0; i<hist.length; i++) {
        for (var j=0; j<hist[i]; j++) {
            var pushed = false;
            if (sum(hist) === 14) {
                var hand_tmp = hist.slice(0);
                hand_tmp[i] -= j;
                if (sum(hand_tmp.slice(i)) === 1) {
                    buffer.push(swig.compile('<span class="left" style="margin-left: {{tile_width}}px;"><a data-tile="{{ tile_num }}" class="left tile-holder" onclick="return false;" href="#"><div class="tile tile-{{ tile_num }}"></div></a></span>')({tile_width: cfg.tile_width, tile_num: i}));
                    pushed = true;
                }
            }
            if (!pushed) {
                buffer.push(shared.tile(i));
            }
        }
    }
    return buffer.join(' ');
};
