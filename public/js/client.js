/*global Handlebars: false, $: false, console: false, require: false, module: false, window: false */

"use strict";
var INIT = (function ($, undefined) {

    var cfg = {
        previous_moves: [],
        clickEvent : /(iPad|iPhone)/i.test(navigator.userAgent) ? 'touchend' : 'click'
    };
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
	        // name	    id	    buffered
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
    };

    // touch navigation
    function pushMove() {
        if (cfg.previous_moves.length === 1) {
            cfg.previous_moves.shift();
        }
        cfg.previous_moves.push(new Date().getTime());
    }

    function clearMoves() {
        cfg.previous_moves = [];
    }
    
    function recentMove() {
        var current_time = new Date().getTime();
        for (var i in cfg.previous_moves) {
            if ((current_time - cfg.previous_moves[i]) / 1000.0 < 0.4) {
                clearMoves();
                return true;
            }
        }
        clearMoves();
        return false;
    }
    
    $.fn.fastClick = function(selector, callback) {
        this.delegate(selector, cfg.clickEvent, function (evt) {
            if (!recentMove()) {
                callback.call(this, evt);
            }
        });
        return this;
    };
    
    function ajax(params) {
        // a convenience wrapper around $.ajax that does some extra default stuff
        // for making valid signed requests
        params = $.extend(
            {
                type: 'GET',
                dataType: 'json'
                // error: ajaxError
            },
            params
        );
        return $.ajax(params);
    }

    function getHashParams() {

            var hashParams = {};
        var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&;=]+)=?([^&;]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
        q = window.location.hash.substring(1);

        while (e = r.exec(q)) {
            hashParams[d(e[1])] = d(e[2]);
        }

        return hashParams;
    }

    function updateHand(data) {
        data = $.extend({}, data, {ajax: true});
        var _cfg = {url: '/game',
                    data: (data),
                    success: function (data) {
                        if (data.new_tile) {
                            data.partial_hand = data.hand.slice(0);
                            data.partial_hand[data.new_tile] -= 1;
                        } else {
                            data.partial_hand = data.hand;
                        }
                        data.discards.splice(data.discards.indexOf(data.recommended.discard_tile[0]), 1);
                        $('body').html(Handlebars.compile($('#firstTemplate').html())(data));
                        if (data.new_tile) {
                            $('#hand-tiles').append(Handlebars.compile('<span class="left" style="margin-left: {{tile_width}}px;">{{{render_tile i}}}</span>')({tile_width: cfg.tile_width, i: data.new_tile}));
                        }
                        for (var i=0; i<data.hand.length; i++) {
                            if (data.hand[i] > 0) {
                                $('#hand-tiles').find('div.tile-'+i).attr('title', data.recommended.score[i]);
                            }
                        }
                        if (!data.msg) {
                            var tile = $('#hand-tiles').find('div.tile-'+data.recommended.discard_tile+':last').closest('a').addClass('selected');
                        }
                    }};
        ajax(_cfg);
    }

    function sum (arr){
        for(var s = 0, i = arr.length; i; s += arr[--i]);
        return s;
    }

    function initialize(local_cfg) {
        $.extend(cfg, local_cfg);
    }
    
    function checkHash() {
        var params = getHashParams();
        if (params.tile && params.wall && params.hand) {
            updateHand(params);
        } else {
            updateHand();
        }
    }
    $(function () {
        if (cfg.mobile) {
            $('body').addClass('mobile');
        }
            var templates = {tile: Handlebars.compile('<a data-tile="{{i}}" class="left tile-holder" onclick="return false;" href="#"><div class="tile tile-{{i}}"></div></a>')
                            };
        
        Handlebars.registerHelper('render_tiles', function(hist) {
            var buffer = [],
            i;
            for (i=0; i<hist.length; i++) {
                for (var j=0; j<hist[i]; j++) {
                    var pushed = false;
                    if (sum(hist) === 14) {
                        var hand_tmp = hist.slice(0);
                        hand_tmp[i] -= j;
                        if (sum(hand_tmp.slice(i)) === 1) {
                            buffer.push(Handlebars.compile('<span class="left" style="margin-left: {{tile_width}}px;">{{{render_tile i}}}</span>')({tile_width: cfg.tile_width, i: i}));
                            pushed = true;
                        }
                    }
                    if (!pushed) {
                        buffer.push(templates.tile({i: i}));
                    }
                }
            }
            return buffer.join(' ');
        });

        Handlebars.registerHelper('render_score', function(hist, score) {
            var buffer = [],
            i;
            for (i=0; i<hist.length; i++) {
                for (var j=0; j<hist[i]; j++) {
                    buffer.push('<div class="left tile-width center">' + score[i] + '</div>');
                }
            }
            return buffer.join('');
        });

        Handlebars.registerHelper('render_tile', function(i) {
            return templates.tile({i: i});
        });

        $('body').fastClick('div.tile', function(evt) {
            evt.preventDefault();
            var $t = $(this),
                $a = $(this).closest('a'),
                tile;
            if ($a.closest('#hand-tiles').length > 0) {
                tile = $(this);
            } else {
                tile = $('#hand-tiles').find('div.tile-'+$a.data('tile')+':last');
            }
            tile.fadeOut('slow', function() {
                window.location.hash = 'tile=' + $a.data('tile') + '&wall=' + $('#wall').data('wall') + '&hand=' + $('#hand').data('hand') + ($('#thrown').data('thrown') ? '&thrown=' + $('#thrown').data('thrown') : '');
            });
        });

        $(window).hashchange( function(){
            checkHash();
        });
        $(window).hashchange();

        $('body').bind('touchmove', pushMove);
        setTimeout(function() { window.scrollTo(0, 1); }, 0);
    });


    return {
        cfg        : cfg,
        initialize : initialize
    };
})(jQuery);