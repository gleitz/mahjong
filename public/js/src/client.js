/*global jQuery swig console window shared io _ */

var INIT = (function ($, undefined) {

    var cfg = {
        previous_moves: [],
        clickEvent : /(iPad|iPhone)/i.test(navigator.userAgent) ? 'touchend' : 'click'
    },
        board_tpl,
        socket,
        can_play = false;

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

    function markWinner(player_id) {
        var player_name;
        if (player_id <= 1) {
            player_name = 'Computer ' + player_id.toString();
        } else {
            var player = shared.getPlayer(cfg.players, player_id);
            player_name = player.name;
        }
        $('.msg').text(player_id.toString() + " is the winner!");
    }

    function notifyTurn(player_id) {
        var msg;
        if (player_id == cfg.player._id) {
            msg = 'Your turn';
        } else if (shared.isComputer(player_id)) {
            msg = 'Computer ' + player_id + '\'s turn';
        } else {
            msg = cfg.player_map[player_id].name + '\'s turn';
        }
        $('.msg').text(msg);
    }

    function clearNotifications() {
        $('.msg').text("");
    }

    function initialize(local_cfg) {
        $.extend(cfg, local_cfg);
    }

    $(function () {
        // swig initialization
        shared.augmentSwig(swig);
        board_tpl = $('#board_tpl').html();
        if (board_tpl) {
            board_tpl = swig.compile($('#board_tpl').html());
        }

        if (cfg.mobile) {
            $('body').addClass('mobile');
        }
        if (cfg.game && cfg.player && cfg.game.current_player_id == cfg.player._id) {
            can_play = true;
        }
        if (cfg.game && typeof cfg.game.winner_id === 'number') {
            markWinner(cfg.game.winner_id);
            can_play = false;
        }
        if (cfg.game && cfg.game.current_player_id && !cfg.isLobby) {
            notifyTurn(cfg.game.current_player_id);
        }
        if (cfg.isLobby) {
            var url = window.location.href;
            url.replace('play', 'game');
            $('#start-label').val(url);
        }
        $('body').fastClick('a.start', function(evt) {
            evt.preventDefault();
            socket.emit('start_game', {game_id: cfg.game_id});
            return false;
        });
        $('body').fastClick('div.tile', function(evt) {
            evt.preventDefault();
            if (!can_play) {
                return false;
            }
            can_play = false;
            clearNotifications();
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
        var socket_resource = (cfg.base_path + '/socket.io').slice(1);
        socket = io.connect('/?token=' +
                            cfg.socketIo.token, {resource: socket_resource});
        socket.on('connect', function() {
            socket.emit('room', cfg.game_id);
            if (cfg.isLobby) {
                socket.emit('join_lobby', {game_id: cfg.game_id});
            }
        });
        socket.on('player_joined', function(data) {
            var player_str = [];
            _.each(data.players, function(player) {
                player_str.push($('<li>', {text: player.name}).clone().wrap('<div>').parent().html());
            });
            $('.players').html(player_str.join(' '));
        });
        socket.on('discard_response_other_player', function(data) {
            var other_player = data.player;
            data.player = {_id: cfg.player._id,
                          name: cfg.player.name};
            $('body').html(board_tpl(data));
            if (data.game.current_player_id == cfg.player._id) {
                can_play = true;
            }
            if (data.msg && data.msg.indexOf('Tsumo') != -1) {
                markWinner(other_player._id);
                can_play = false;
            } else {
                notifyTurn(data.game.current_player_id);
            }
        });
        socket.on('discard_response_this_player', function(data) {
            $('body').html(board_tpl(data));
            if (data.msg && data.msg.indexOf('Tsumo') != -1) {
                markWinner(data.player._id);
            } else {
                notifyTurn(data.game.current_player_id);
            }
            if (!data.msg) {
                // TODO(gleitz): re-enable suggestions
                // $('#player-tiles').find('div.tile-' + data.recommended.discard_tile + ':last').closest('a').addClass('selected');
            }
        });
        socket.on('start_game', function() {
            window.location = cfg.base_path + '/game/' + cfg.game_id;
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
