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
        params = $.extend(
            {
                type: 'GET',
                dataType: 'json'
            },
            params
        );
        return $.ajax(params);
    }

    function updateHand(data) {
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
            if ($a.closest('#player-tiles').length > 0) {
                tile = $(this);
            } else {
                tile = $('#player-tiles').find('div.tile-'+$a.data('tile')+':last');
            }
            tile.fadeOut('slow', function() {
                updateHand({game_id: cfg.game_id,
                            tile: $a.data('tile')});
            });
        });

        // initialize socket.io
        socket = io.connect(cfg.base_path + '?token=' +
                            cfg.socketIo.token);
        socket.on('connect', function() {
            socket.emit('room', cfg.game_id);
        });
        socket.on('discard_response_other_player', function(data) {
            shared.renderPlayerTiles(data.game, cfg.player._id);
            console.log(cfg);
            data.player = {_id: cfg.player._id,
                          name: cfg.player.name};
            $('body').html(board_tpl(data));
            if (data.msg) {
                alert("somebody got a mahjong");
            }
        });
        socket.on('discard_response_this_player', function(data) {
            shared.renderPlayerTiles(data.game, cfg.player._id);
            $('body').html(board_tpl(data));
            if (!data.msg) {
                // TODO(gleitz): re-enable suggestions
                // $('#player-tiles').find('div.tile-' + data.recommended.discard_tile + ':last').closest('a').addClass('selected');
            }
        });

        // highlight the current tile to throw
        if (cfg.isSimulation && !cfg.msg) {
            //TODO(gleitz): allow enabling this option
            // $('#player-tiles').find('div.tile-' + cfg.recommended.discard_tile + ':last').closest('a').addClass('selected');
        }

        $('body').bind('touchmove', pushMove);
        setTimeout(function() { window.scrollTo(0, 1); }, 0);
    });


    return {
        cfg: cfg,
        initialize: initialize
    };

})(jQuery);
