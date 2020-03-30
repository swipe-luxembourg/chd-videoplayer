/**
 * @class Video Player based on videojs.
 * @param elementId: String
 * 			The HTML <video> element to bind to
 * 
 * @param options: Object
 * 			It allows you to set additional options like you can with the data-setup attribute.
 * 			see http://docs.videojs.com/docs/guides/options.html
 * 
 * @param onReadyCB: function(p) 
 * 			Called when the player is ready to receive commands
 * 			@param p the videojs player
 * 
 * @param onErrorCB: function(code, error)
 * 			Called when there is an error
 * 			@param code: the error code from videojs
 * 			@param error: the error message from videojs
 * 
 * @param onTimeUpdateCB: function(t, event, player)
 * 			Called when the time is updated
 * 			@param t: int
 * 				The time, in seconds
 * 			@param event: String 
 * 				The event that fired the timeupdate ('timeupdate' or 'seek')
 * 			@param player
 * 				The videoJS player
 * 
 */
var VideoPlayer = function(elementId, options, onReadyCB, onErrorCB, onTimeUpdateCB) 
{
//VideoPlayer START
	
    //////////////////////////////////////////
    //       private vars & functions       //
    //////////////////////////////////////////
	/** Callback for when the videojs player is ready, so whe can attach the event callbacks we need */
    var m_videoLoadedCallback = function(player)
    	{
			if(!player)
			{
				player = this;
			}
			
			var onerror = function()
			{
				if(onErrorCB)
				{
					var error = player.error_ && player.error_.code ? player.error_.message : "";
					if(error)
					{
						var code = m_player.error_.code;
						onErrorCB(code, error);
					}
				}
			};
			
			// watch for errors on creation, not sure it's useful, maybe it's called with the attached event below?
			onerror();
			player.on('error', onerror);
			
			if(onTimeUpdateCB) {
				player.on('timeupdate', function (e) {
					
					if(!player.paused())
					{
				        var t = player.currentTime();
				        onTimeUpdateCB(t, 'timeupdate', player);
				    }
			    });
			    
			    player.on(['seeked', 'seeking'], function (e) {
			    	if(player.paused())
			    	{
			    		var t = player.currentTime();
				    	onTimeUpdateCB(t, 'seek', player);
				    	//console.log("(seek)");
				    }
				    // else the timeupdate is fired
			    });
			}
    	},
    	
    	/** The videojs player construction */
    	m_player = videojs(
    		elementId,
    		options,
			function() {
				var p = this;
				m_videoLoadedCallback(p);
				
				if(onReadyCB) onReadyCB(p);
			}
		),
		
		/** Ask to play the video when it's ready */
		m_playWhenBuffered = function(onPlayCB)
		{
    		m_player.on('canplay', function(e) {
				m_player.play();
				
				// mpeg dash bugfix it seems
				//m_player.currentTime(0.2);
				
				m_player.off('canplay');
				
				if(onPlayCB) onPlayCB();
			});
		},
		
		/** Clean the player */
		m_dispose = function() {
			if ((m_player !== undefined) && (m_player !== null)) {
				m_player.dispose();
		        console.log("player "+elementId+" disposed ok");
		    }
		};
   	
   	
    
    //////////////////////////////////////////
    //              end private             //
    //////////////////////////////////////////
    
    return {
    
        //////////////////////////////////////////
        //       public vars & functions        //
        //////////////////////////////////////////
    	
    	/* GETTERS */
    	/** returns the videojs player */
    	getPlayer: 		function() 	{ return m_player; 					},
    	/** returns the current time in seconds */
    	getCurrentTime: function() 	{ return m_player.currentTime(); 	},
    	/** return the current media source */
    	getCurrentSrc: 	function() 	{ return m_player.currentSrc(); 	},
    	/** return the current media type */
    	getCurrentType: function() 	{ return m_player.currentType(); 	},
    	
    	/* ACTIONS */
    	/** asks the player to play when it's ready, a lot better than just calling play() on the videojs player */
    	playWhenBuffered: function(onPlayCB) { m_playWhenBuffered(onPlayCB); },
    	
    	/** 
    	 * change the current sources
    	 * @param src: Object or Array of Objects :
    	 * 		{
    	 * 			src: String => url to the media,
    	 * 			type: String => mime type of the media
    	 * 		}
    	 */
    	setSrc: function(src) { m_player.src(src); },
    	
    	/** dispose the player, call this on the scope destruction */
    	dispose: function() { m_dispose(); }
    	
        
        //////////////////////////////////////////
        //               end public             //
        //////////////////////////////////////////
    };
    
//VideoPlayer END
};







