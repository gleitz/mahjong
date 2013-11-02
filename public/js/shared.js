/*global swig */

(function(exports){

    exports.tile = function (input) {
        return swig.compile('<a data-tile="{{ tile_num }}" class="left tile-holder" onclick="return false;" href="#"><div class="tile tile-{{ tile_num }}"></div></a>')({tile_num: input});
    };

    exports.augmentSwig = function(swig){
        swig.setFilter('tile', exports.tile);
    };

}(typeof exports === 'undefined' ? this.shared = {} : exports));