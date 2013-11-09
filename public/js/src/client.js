/*global jQuery swig console window shared io */

var INIT = (function ($, undefined) {

    var cfg = {
        previous_moves: [],
        clickEvent : /(iPad|iPhone)/i.test(navigator.userAgent) ? 'touchend' : 'click'
    },
        board_tpl;

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

    function updateHand(data) {
        data = $.extend({}, data, {ajax: true});
        var _cfg = {url: cfg.base_path + '/game/' + cfg.game_id,
                    data: (data),
                    success: function (data) {
                        if (data.new_tile) {
                            data.partial_hand = data.hand.slice(0);
                            data.partial_hand[data.new_tile] -= 1;
                        } else {
                            data.partial_hand = data.hand;
                        }
                        data.discards.splice(data.discards.indexOf(data.recommended.discard_tile[0]), 1);
                        data.rendered_tiles = shared.renderTiles(data.partial_hand, cfg);
                        $('body').html(board_tpl(data));
                        if (data.new_tile) {
                            $('#hand-tiles').append(swig.compile('<span class="left" style="margin-left: {{tile_width}}px;"><a data-tile="{{ tile_num }}" class="left tile-holder" onclick="return false;" href="#"><div class="tile tile-{{ tile_num }}"></div></a></span>')({tile_width: cfg.tile_width, tile_num: data.new_tile}));
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

    function initialize(local_cfg) {
        $.extend(cfg, local_cfg);
    }

    $(function () {
        // swig initialization
        shared.augmentSwig(swig);
        board_tpl = swig.compile($('#board_tpl').html());

        if (cfg.mobile) {
            $('body').addClass('mobile');
        }
        $('body').fastClick('div.tile', function(evt) {
            evt.preventDefault();
            var $t = $(this),
                $a = $t.closest('a'),
                tile;
            if ($a.closest('#hand-tiles').length > 0) {
                tile = $(this);
            } else {
                tile = $('#hand-tiles').find('div.tile-'+$a.data('tile')+':last');
            }
            tile.fadeOut('slow', function() {
                updateHand({tile: $a.data('tile')});
            });
        });

        // initialize socket.io
        var socket = io.connect(cfg.base_path + '/' +
                                cfg.socketIo.namespace + '?token=' +
                                cfg.socketIo.token);
        socket.on('news', function (data) {
            console.log(data);
            socket.emit('my other event', { my: 'data' });
        });

        $('body').bind('touchmove', pushMove);
        setTimeout(function() { window.scrollTo(0, 1); }, 0);
    });


    return {
        cfg: cfg,
        initialize: initialize
    };
})(jQuery);
