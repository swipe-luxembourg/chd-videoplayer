$(function() {

    // -----------------------------------------------------------------------------------------------
    // Retrieve URL parameters
    // -----------------------------------------------------------------------------------------------

    function getParameter(name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results == null) {
            return null;
        } else {
            return results[1] || 0;
        }
    }

    // urls like 'video/{v_id}/sequence/{seq_id}.html' => get seq_id
    function getTimecode() {
        var loc = $(location).attr('pathname'),
            match = /.*\/sequence\/(\d*).html/.exec(loc),
            seqId = getParameter('sequence'); // this is enabled for tests only, it's not used by the calling apps


        if (match) { //we want a sequence
            seqId = match[1]
        }

        if (seqId) {
            timeCode = $('*[data-sequence="' + seqId + '"]').first().data('timecode');

            console.log("found sequence " + seqId + " in url, timeCode = " + timeCode);

            return parseInt(timeCode);
        }

        return null;
    }

    // urls like 'video/{v_id}.html' or with a sequence => get v_id
    function getVideoId() {
        var videoId = $('*[data-video-id]').first().data('video-id');
        return $.isNumeric(videoId) ? parseInt(videoId) : null;
    }

    // -----------------------------------------------------------------------------------------------
    // Go to a timecode and play
    // Mobile device bug
    // On first load if we choose a timestamp video start at 0 sec
    // SetTimeOut fix this bug
    // -----------------------------------------------------------------------------------------------
    function goToAndPlay(videoPlayer, timeCode) {
        videoPlayer.play();
        setTimeout(function() {
            if (timeCode || timeCode === 0) {
                timeCode /= 1000; // timeCode in milliseconds
                videoPlayer.currentTime(timeCode);
            }
            videoPlayer.play();
        }, 100);

        // if(timeCode || timeCode === 0) {
        // timeCode /= 1000; // timeCode in milliseconds
        // videoPlayer.currentTime(timeCode);
        // }
        // videoPlayer.play();
    }


    // --------------------------------------------------------------------------------------------------------------
    // Event management
    // --------------------------------------------------------------------------------------------------------------

    // get an agenda for a given time
    var getAgendaForTime = function( /* time */ ) { // <- it is confusing because it returns a function that wants a param
        // store items with their timecodes for fast access, array of {agenda: jqueryElement, time: milliseconds}
        var timeCodes = [];

        $('.agenda-item').each(function(index, elem) {
            timeCodes.push({
                agenda: $(elem),
                time: parseInt($(elem).data('timecode'))
            });
        });

        // this is the returned function
        return function(time) { // time as seconds
            time *= 1000; // timecodes as milliseconds
            for (var i = 0; i < timeCodes.length; i++) {
                if (timeCodes[i].time > time) {
                    if (i > 0) return timeCodes[i - 1].agenda;
                    return timeCodes[0].agenda;
                }
            };
            // last agenda
            return timeCodes[timeCodes.length - 1].agenda;
        };
    }(); // executed but returns a function(time);


    // Agenda update, called on play/pause and timeupdate when the current item changes,
    // whoever fired them (button click, click inside video, autoplay...)
    var updateAgendas = function(p) {
        // TODO Nico:
        // - toujours laisser visible l'endroit où l'on est, gérer ça avec $currentAgenda
        // - gérer les boutons pause/play en fonction de isPlaying

        var isPlaying = !p.paused(),
            currentTime = p.currentTime(),
            timeCode = currentTime * 1000,
            $currentAgenda = getAgendaForTime(currentTime);

        console.log("## up! ##");

        // remove playing state for all
        $('.agenda-item').removeClass('agenda-playing agenda-current');
        $currentAgenda.addClass('agenda-current');

        // add playing state for current
        if (isPlaying) {
            $currentAgenda.addClass('agenda-playing');
            $currentAgenda.parents('.agenda-item').addClass('agenda-open');

            /*if (window.matchMedia("(min-width:768px)").matches) {
                $agendaItem.addClass('agenda-playing');
            }*/
        } else {

        }
    }


    // holds the last agenda in memory, because timeupdate is called a lot
    // so we'll do stuf only if the item changes
    var $lastAgenda = undefined;
    var onTimeUpdate = function(t, event, p) {

        console.log("time = " + t + " (" + event + ")");


        var $currentAgenda = getAgendaForTime(t);
        if ($lastAgenda !== $currentAgenda) // we changed agenda
        {
            console.log("=> " + $currentAgenda.find(".agenda-title").text());

            // $('.agenda-item').removeClass('agenda-playing');
            // $currentAgenda.addClass('agenda-playing');
            // $currentAgenda.parents('.agenda-item').addClass('agenda-open');
            updateAgendas(p);

            $lastAgenda = $currentAgenda;
        }

    };



    // -----------------------------------------------------------------------------------------------
    // Initialize the videojs player, when it's ready : resize and play
    // -----------------------------------------------------------------------------------------------

    // video element id
    var videoID = "video-player";

    // 1) get the source + type and remove the html source element (causes weird stuff with videojs)
    var sourceElem = $('#' + videoID + ' source:first'),
        src = sourceElem.attr('src'),
        type = sourceElem.attr('type'); // always 'application/x-mpegURL' for us

    console.log("found source: " + src + " of type " + type);
    sourceElem.remove();

    // 2) instanciate the player
    var chdPlayer = VideoPlayer(
            videoID, {
                controls: true,
                preload: "auto",
                textTrackSettings: false,
                width: 752,
                height: 450
            },
            function onReadyCB(p) {
                try {

                    // 3) set the source when the player is ready

                    // if source is not found, set an incorrect one to trigger the standard "no source" message
                    if (!src) {
                        src = "invalid";
                        type = "invalid";
                    }
                    p.src({
                        src: src,
                        type: type
                    });

                    var timeCode = getTimecode();

                    p.play();

                    if (timeCode || timeCode === 0) {
                        p.on('canplay', function(e) {
                            // play
                            //goToAndPlay(p, timeCode);

                            timeCode /= 1000; // timeCode in milliseconds
                            p.currentTime(timeCode);
                            //p.play();

                            p.off('canplay');
                        });
                    }


                } catch (err) {
                    console.log("Error: " + err);
                }
            },
            function onErrorCB(code, error) {
                console.log(error);
            },
            function onTimeUpdateCB(t, event, p) {
                onTimeUpdate(t, event, p);
            }),
        player = chdPlayer.getPlayer();




    // -----------------------------------------------------------------------------------------------
    // Action on video end (poster can't be displayed again after video start)
    // -----------------------------------------------------------------------------------------------

    player
        .on('ended', function() {
            this.bigPlayButton.show();
            this.currentTime(0);
        });

    // -----------------------------------------------------------------------------------------------
    // Action on video player pause/start button and play / pause events
    // -----------------------------------------------------------------------------------------------

    /*$('#' + videoID)
        .on('click', '.vjs-playing', function() {

            console.log("pressed pause");

            $('.agenda-item').removeClass('agenda-playing');

            // Play from timeCode (ex: when the user comes from direct url after a mailto)
            //var timeCode = getParameter('t');
            var timeCode = getTimecode();

            if (timeCode) {
                goToAndPlay(player, timeCode);
            }
        });

    $('#' + videoID)
        .on('click', '.vjs-paused', function() {
            console.log("pressed play");
        });
    */

    // when play is called for whatever reason
    player.on('play', function() {
        console.log('play');
        updateAgendas(player);
    });

    // when pause is called for whatever reason
    player.on('pause', function() {
        console.log('pause');
        updateAgendas(player);
    });

    // -----------------------------------------------------------------------------------------------
    // Sticky video player (only for desktop)
    // -----------------------------------------------------------------------------------------------

    //if (window.matchMedia("(min-width:1024px)").matches) {

    if ($(window).width() > 1023) {
        $('#video').fixTo('body');
    }

    // -----------------------------------------------------------------------------------------------
    // Agenda actions
    // -----------------------------------------------------------------------------------------------

    $('#agenda')

    // Play (switch for stop button only on desktop)
    .on('click', '.agenda-title, .button-play', function(e) {
        var $agendaItem = $(this).closest('.agenda-item'),
            timeCode = $(this).parents('.agenda-item').data('timecode');
        goToAndPlay(player, timeCode); // triggers the 'play' event
        return false;
    })

    // Stop button only visible for desktop (media query in play button)
    .on('click', '.button-stop-red', function(e) {
        e.preventDefault();
        player.pause(); // triggers the 'pause' event
        return false;
    })

    // Show download button
    .on('click', '.button-download', function(e) {
        e.preventDefault();
        $('#download').removeClass('hidden');
        return false;
    })

    // Expand and collapse
    .on('click', '.button-expand, .button-collapse', function(e) {
        e.preventDefault();
        var $agendaItem = $(this).closest('.agenda-item');
        if ($agendaItem.hasClass('agenda-open')) {
            $agendaItem.removeClass('agenda-open');
        } else {
            $agendaItem.addClass('agenda-open');
        }
        return false;
    })

    // Sharebox
    .on('click', '.button-share', function(e) {
        e.preventDefault();
        $('#sharebox').addClass('show');
        return false;
    })

    // Mailto
    .on('click', '.button-mail', function(e) {
        e.preventDefault();
        var $agendaItem = $(this).closest('.agenda-item'),
            //timeCode    = $agendaItem.data('timecode'),
            sequenceId = $agendaItem.data('sequence'),
            mailSubject = document.title,
            //mailBody    = 'Voici une vidéo intéressante : http://playground.pinkegg.be/chd-videoplayer?t=' + timeCode;
            appName = $(location).attr('pathname').split('/')[1], //could just use 'ArchivePlayer' ?
            videoId = getVideoId(),
            url = $(location).attr('host') + '/' + appName + '/video/' + videoId + '/sequence/' + sequenceId + '.html',
            mailBody = 'Voici une vidéo intéressante : ' + url;

        mailSubject = mailSubject.replace(/"/g, '%22');
        mailBody = mailBody.replace(/&/g, '%26');

        var mailto = 'mailto:?subject=' + mailSubject + '&body=' + mailBody;
        console.log(mailto);

        location.href = mailto;
        return false;
    });

    // -----------------------------------------------------------------------------------------------
    // Action on sharebox buttons
    // -----------------------------------------------------------------------------------------------

    $('#sharebox')
        .on('click', '.button-close', function(e) {
            e.preventDefault();
            $('#sharebox').removeClass('show');
            $('#sharebox .tabs-wrapper .tabs-item:first-child .tabs-link').click();
            $('#sharebox .txt-field').val('');
            return false;
        });

    // -----------------------------------------------------------------------------------------------
    // Tabs
    // -----------------------------------------------------------------------------------------------

    $('.tabs-wrapper')
        .on('click', '.tabs-link', function(e) {
            e.preventDefault();
            var $tabsWrapper = $(this).closest('.tabs-wrapper');
            $tabsWrapper.find('.tabs-item, .tabs-content').removeClass('tabs-selected');
            $(this).parent().addClass('tabs-selected');
            $($(this).attr('href')).addClass('tabs-selected');
            return false;
        });

    // -----------------------------------------------------------------------------------------------
    // Action on legend box
    // -----------------------------------------------------------------------------------------------

    $('#legend').on('click', '.legend-header', function(e) {
        e.preventDefault();
        var $legend = $('#legend');
        var $legendButton = $legend.find('.button-more');
        if ($legend.hasClass('is-open')) {
            $legend.removeClass('is-open');
            $legendButton.removeClass('button-collapse-white').addClass('button-expand-white');
        } else {
            $legend.addClass('is-open');
            $legendButton.removeClass('button-expand-white').addClass('button-collapse-white');
        }
        return false;
    });

    // -----------------------------------------------------------------------------------------------
    // Action on download box
    // -----------------------------------------------------------------------------------------------

    $('#download').on('click', '.button-close', function(e) {
        e.preventDefault();
        $('#download').addClass('hidden');
        return false;
    });

});
