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

    var blinkInterval;
    function clearBlinkTitle() {
        clearInterval(blinkInterval);
    }
    function blinkTitle() {
        clearBlinkTitle();
        var isOldTitle = true;
        var oldTitle = "Cock-eyed Mahjong";
        var newTitle = "YOUR TURN";
        function changeTitle() {
            document.title = isOldTitle ? oldTitle : newTitle;
            isOldTitle = !isOldTitle;
        }
        blinkInterval = setInterval(changeTitle, 1000);
        $(window).focus(function () {
            clearInterval(blinkInterval);
            $("title").text(oldTitle);
        });
    }

    function markWinner(player_id) {
        var msg;
        if (player_id <= 1) {
            msg = 'Computer ' + player_id.toString() + ' is the winner!';
        } else if (player_id == cfg.player._id) {
            msg = 'You are the winner!';
        } else {
            var player = shared.getPlayer(cfg.players, player_id);
            msg = player.name + " is the winner!"
        }
        $('.player-' + player_id + ' a.tile-holder.hidden').removeClass('hidden');
        $('.msg').text(msg);
        $('#play-again').removeClass('hide');
        can_play = false;
        clearBlinkTitle();
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

    function playSound(type) {
        var sound = $('#' + type).get(0);
        sound.pause();
        sound.currentTime = 0;
        sound.play();
    }

    function enablePlayer() {
        can_play = true;
        $('#player-tiles a.hidden').removeClass('hidden');
        blinkTitle();
    }

    function revealHiddenTiles() {
        $('a.tile-holder.hidden').removeClass('hidden');
    }

    function renderBoard(data) {
        //TODO(gleitz): extend automatically
        // or only refresh parts of the page
        data.base_path = cfg.base_path;
        $('#board').html(board_tpl(data));
        if (cfg.isOpen) {
            revealHiddenTiles();
        }
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

        if (cfg.isOpen) {
            revealHiddenTiles();
        }

        if (cfg.mobile) {
            $('body').addClass('mobile');
        }
        if (cfg.game && cfg.player && cfg.game.current_player_id == cfg.player._id) {
            enablePlayer();
        }
        if (cfg.game && shared.exists(cfg.game.winner_id) &&
            cfg.game.current_player_id == cfg.game.winner_id) {
            markWinner(cfg.game.winner_id);
        } else if (cfg.game && cfg.game.current_player_id && !cfg.isLobby) {
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
        $('body').fastClick('.pon', function(evt) {
            evt.preventDefault();
            socket.emit('pon', {game_id: cfg.game_id});
            return false;
        });
        $('body').fastClick('.pon-dismiss', function(evt) {
            evt.preventDefault();
            socket.emit('pon_dismiss', {game_id: cfg.game_id});
            return false;
        });
        $('body').fastClick('#ron-button', function(evt) {
            evt.preventDefault();
            socket.emit('ron', {game_id: cfg.game_id});
            return false;
        });
        $('body').fastClick('div.tile', function(evt) {
            evt.preventDefault();
            var $this = $(this);
            if (!can_play) {
                return false;
            }
            if ($this.closest('div.side').length) {
                // cannot throw tile you've pon'd, kan'd
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
            clearBlinkTitle();
            tile.fadeOut('slow', function() {
                updateHand({game_id: cfg.game_id,
                            tile: $a.data('tile')});
            });
        });

        $('body').on('mouseenter mouseleave', '#player-tiles .tile-holder', function (evt) {
            evt.preventDefault();
            var $this = $(this);
            if ($this.closest('div.side').length) {
                // disallow throwing tiles you've pon'd, kan'd
                return false;
            }
            if (evt.type === 'mouseenter') {
                if (can_play) {
                    $this.stop().animate({marginTop: '-8px'}, 100);
                }
            } else {
                $this.stop().animate({marginTop: '4px'}, 300);
            }
            return false;
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
        socket.on('update', function(data) {
            data.player = {_id: cfg.player._id,
                          name: cfg.player.name};
            renderBoard(data);
            if (shared.exists(data.game.winner_id) &&
                data.game.current_player_id == data.game.winner_id) {
                markWinner(data.game.winner_id);
            } else {
                notifyTurn(data.game.current_player_id);
            }
            if (data.action) {
                playSound(data.action);
            }
            if (data.game.current_player_id == cfg.player._id) {
                enablePlayer();
            }
            if (shared.exists(data.can_ron_player_id) &&
                data.can_ron_player_id == cfg.player._id) {
                $('#ron-button').removeClass('hide');
            } else if (shared.exists(data.can_pon_player_id) &&
                data.can_pon_player_id == cfg.player._id) {
                $('#pon-button').removeClass('hide');
            }
            if (!data.msg) {
                // TODO(gleitz): re-enable suggestions
                // $('#player-tiles').find('div.tile-' + data.recommended.discard_tile + ':last').closest('a').addClass('selected');
            }
        });
        socket.on('start_game', function() {
            window.location = cfg.base_path + '/game/' + cfg.game_id;
        });
        socket.on('game_over', function() {
            $('.msg').text("Game over, man. No more tiles");
            $('#play-again').removeClass('hide');
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
