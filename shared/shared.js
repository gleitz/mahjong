/*
 * Shared functions for use on both the client and the server
 */

// Establish the root object, `window` in the browser, or `exports` on the server.
var root = this;
// Create a safe reference to the shared object for use below.
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
    var _ = require('underscore');
}

shared.sum = function(arr){
    for(var s = 0, i = arr.length; i; s += arr[--i]);
    return s;
}

shared.isComputer = function (player_id) {
    return shared.exists(player_id) && player_id <= 1;
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

shared.exists = function(val) {
    return _.contains(['string', 'number'], typeof val);
}

var tile_compiled;
shared.renderTile = function(tile_num, is_hidden) {
    return tile_compiled({tile_num: tile_num,
                          is_hidden: is_hidden});
}

/* Swig templating functions */
shared.augmentSwig = function(swig) {
    var last_tile_compiled = swig.compile('<span class="left last-tile"><a data-tile="{{ tile_num }}" class="left tile-holder{% if is_hidden %} hidden{% endif %}" href="javascript:;"><div class="tile tile-{{ tile_num }}"></div></a></span>');
    tile_compiled = swig.compile('<a data-tile="{{ tile_num }}" class="left tile-holder{% if is_hidden %} hidden{% endif %}" href="javascript:;"><div class="tile tile-{{ tile_num }}"></div></a>');

    function renderTiles(seat, is_hidden) {
        var hist = seat.hand.slice(0),
            side = (seat.side && seat.side.slice(0)) || [],
            last_tile = seat.last_tile,
            buffer = [],
            side_buffer = [],
            last_tile_str,
            i;
        _.each(side, function(tile_num) {
            side_buffer.push(shared.renderTile(tile_num, false));
            hist[tile_num] -= 1;
        });
        for (i=0; i<hist.length; i++) {
            for (var j=0; j<hist[i]; j++) {
                var tile_num = i;
                var hand_tmp = hist.slice(0);
                hand_tmp[i] -= j;
                //TODO(gleitz): put back in production
                // var tile_num = is_hidden ? 'hidden' : i;
                if ((shared.sum(hist) + side.length == 14) &&
                    !last_tile_str &&
                    (i === last_tile || shared.sum(hand_tmp.slice(i)) === 1)) {
                    // Separate the last discarded tile. If the game has just started
                    // then separate the last tile in the hand
                    last_tile_str = last_tile_compiled({tile_num: tile_num,
                                                        is_hidden: is_hidden});
                } else {
                    buffer.push(shared.renderTile(tile_num, is_hidden));
                }
            }
        }
        if (!last_tile_str) {
            last_tile_str = last_tile_compiled({tile_num: "placeholder",
                                                is_hidden: true});
        }
        buffer.push(last_tile_str);
        var buffer_str = buffer.join(' '),
            side_str = '<div class="side clr">' + side_buffer.join(' ') + '</div>';
        return buffer_str + side_str;
    }

    function renderHand(game, seat, player_id) {
        var is_hidden = seat.player_id != player_id;
        if (shared.exists(game.winner_id) && game.winner_id == seat.player_id) {
            is_hidden = false;
        }
        return renderTiles(seat, is_hidden);
    }

    function renderDiscard(seat) {
        return _.reduce(seat.discard, function(memo, tile_num) {
            return memo + shared.renderTile(tile_num);
        }, '');
    }

    function variableParser(str, line, parser, types, stack, options) {
        parser.on(types.VAR, function (token) {
            // get the root object (e.g. player.name -> player)
            var top_obj = token.match.split('.')[0];
            // check to see root object exists in the local scope
            // otherwise, look in the global scope
            this.out.push('(typeof ' + top_obj + ' === "undefined" ? ' +
                          '_ctx.' + token.match + ' : ' + token.match +
                          ')');
            return;
        });
        return true;
    }

    swig.setFilter('tile', shared.renderTile);
    swig.setFilter('isComputer', shared.isComputer);
    swig.setExtension('renderHand', renderHand);
    swig.setExtension('renderDiscard', renderDiscard);
    swig.setTag('renderHand',
                variableParser,
                function(compiler, args, content, parents, options, blockName) {
                    return '_output += _ext.renderHand(' +
                        args[0] + ',' + args[1] + ',' + args[2] + ');';
                },
                false);
    swig.setTag('renderDiscard',
                variableParser,
                function(compiler, args, content, parents, options, blockName) {
                    return '_output += _ext.renderDiscard(' +
                        args[0] + ');';
                },
                false);
};
