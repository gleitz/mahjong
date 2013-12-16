/*global jQuery swig console window shared io _ */

var INIT = (function ($, undefined) {

    var cfg = {
        previous_moves: [],
        clickEvent : /(iPad|iPhone)/i.test(navigator.userAgent) ? 'touchend' : 'click'
    },
        board_tpl,
        socket;

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
        console.log(data);
        socket.emit('discard', data);
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
                updateHand({game_id: cfg.game_id,
                            tile: $a.data('tile')});
            });
        });

        // initialize socket.io
        socket = io.connect(cfg.base_path + '?token=' +
                            cfg.socketIo.token);
        socket.on('response', function(data) {
            shared.renderPlayerTiles(data, data.last_tile, cfg);
            $('body').html(board_tpl(data));
            if (!data.msg) {
                $('#hand-tiles').find('div.tile-' + data.recommended.discard_tile + ':last').closest('a').addClass('selected');
            }
        });

        // highlight the current tile to throw
        if (cfg.isSimulation && !cfg.msg) {
            $('#hand-tiles').find('div.tile-' + cfg.recommended.discard_tile + ':last').closest('a').addClass('selected');
        }

        $('body').bind('touchmove', pushMove);
        setTimeout(function() { window.scrollTo(0, 1); }, 0);
    });


    return {
        cfg: cfg,
        initialize: initialize
    };

})(jQuery);
