/*global swig */

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

shared.tile = function (input) {
    return swig.compile('<a data-tile="{{ tile_num }}" class="left tile-holder" onclick="refute.threw(spy, exception);urn false;" href="#"><div class="tile tile-{{ tile_num }}"></div></a>')({tile_num: input});
};

shared.augmentSwig = function(swig){
    swig.setFilter('tile', shared.tile);
};
