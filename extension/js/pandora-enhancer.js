/***
* PandoraEnhancer
* by Brandon Sachs and Curt Hostetter
*/

//we can detect if we're in a shortcut-application after all! requires "tab" permissions - chrome.extension.window.type
//http://code.google.com/chrome/extensions/windows.html#type-Window
//i forgot why that was something we wanted to detect in the first place...

//init
chrome.extension.sendRequest({
    notificationType: 'showPageAction'
}, function(response) { /* json */ });

//debug & dispatched events
var debugLog = function(text)
{
    if(settings.pe.debug_mode == "false") return;
    console.log(text);
};

var dispatchClick = function(selector){
    var subject = selector;
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    subject.dispatchEvent(event);
};

var dispatchHover = function(selector){
    var subject = selector;
    var event = document.createEvent('MouseEvents');
    event.initEvent('mousemove', true, true);
    subject.dispatchEvent(event);
};

//listeners
chrome.extension.onConnect.addListener(function(port)
{
    port.onMessage.addListener(function(message)
    {
        if (message.getTimeInfo)
        {
            port.postMessage({timeInfo: songTimeInfo()});
        }
        
        if (message.getStationList)
        {
            if (settings.pe.notification_show_station_list != "false")
            {   //if this message is not sent, the station list box will not be displayed
                port.postMessage({stationList: getStationList()});
            }
        }
        
        if (message.changeStation)
        {
            changeStation(message.changeStation);
        }
    });
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
    if (request.playerControl)
    {
        playerControl(request.playerControl);
    }
    
    if (request.songTimeInfo)
    {
        return songTimeInfo();
    }
    
    if (request.scrobbleUpdate)
    {
        if (request.scrobbleUpdate == 'showScrobbleStatus')
        {
            scrobbleControl('showScrobbleStatus');
        }
        
        if (request.scrobbleUpdate == 'hideScrobbleStatus')
        {
            scrobbleControl('hideScrobbleStatus');
        }
        
        if (request.scrobbleUpdate == 'nowPlaying')
        {
            scrobbleControl('nowPlaying');
        }
        if (request.scrobbleUpdate == 'scrobbled')
        {
            scrobbleControl('scrobbled');
        }
    }
});

//todo: i can make these actual settings perhaps.
var settings = {
    background_image:   'http://www.pandora.com/static/valances/pandora/default/skin_background.jpg',
    background_color:   '#09102a'
};

//request localStorage settings
chrome.extension.sendRequest({
    notificationType: 'getLocalStorage',
}, function(response){
    settings.pe = response.message;
});

var oldAlbumArt = null;
var newAlbumArt = null;
var ads_hidden = 0;
var song_skip_tries = 0;
var volumeLevelBase = 35;
var volumeLevelIncrement = 0.82;
var volumeLevelRestored = 100;
var isMuted;


var getStationList = function()
{
    var stationList = {};
    jQuery("#stationList > .stationListItem ul li div.stationNameText").each(function(index){
        var stationName = jQuery(this).attr("title");
        if (jQuery(this).parent().parent().parent().hasClass('selected')) index = 'selected';
        stationList[index] = stationName;
    });
    
    return stationList;
}

var changeStation = function(station)
{    
    if (isNaN(station))
    {
        dispatchClick(jQuery("div.stationNameText[title='" + station + "']")[0]);
    }
    else if (!isNaN(station))
    {
        dispatchClick(jQuery("#stationList div:nth-child(" + station + ")")[0]);
    }
    debugLog("PandoraEnhancer - Changing Station");
}

var songTimeInfo = function()
{
    var timeInfo = {}
    
    var elapsedTime = jQuery(".elapsedTime").html();
    elapsedTime = elapsedTime.split(':');
    timeInfo['elapsedTime'] = (parseInt(elapsedTime[0]*60) + parseInt(elapsedTime[1]));
    
    var remainingTime = jQuery(".remainingTime").html();
    remainingTime = remainingTime.replace('-','').split(':');
    timeInfo['remainingTime'] = (parseInt(remainingTime[0]*60) + parseInt(remainingTime[1]));
    
    timeInfo['totalTime'] = timeInfo['elapsedTime'] + timeInfo['remainingTime'];
    return timeInfo;
}



var scrobbleControl = function(action)
{
    if (action == 'showScrobbleStatus')
    {		
        debugLog("PandoraEnhancer - Scrobbler - Logged in");
        var scrobbleImage = chrome.extension.getURL('images/scrobble.png');
        
        jQuery("#brandingBar > .leftcolumn > .logo").css("margin-right", "30px");
        jQuery("#brandingBar > .leftcolumn").append(
            '<span id="scrobbleDiv" style="">'
            +'<span style="">'
            +'<img src="' + scrobbleImage + '" style="float:left;"><span id="scrobbleStatus" class="rightcolumn" style="font-size:12px;float:left;margin-left:5px;padding:0 !important;left:-160px"></span>'
            +'</span></span>'
        );
        
        chrome.extension.sendRequest({
            notificationType:   'analytics',
            msgParams: {
                event_name:     'Last.fm',
                event_action:   'logged in'
            }
        }, function(response) {});
    }
    
    if (action == "loveTrack")
    {
        var songName    = jQuery(".playerBarSong")[0].textContent;
        var artistName  = jQuery(".playerBarArtist")[0].textContent;

        chrome.extension.sendRequest({
            lastfmAction: 'love',
            msgParams: {
                artistName: artistName,
                songName:   songName
            }
        }, function(response) {});
        
        chrome.extension.sendRequest({
            notificationType:   'analytics',
            msgParams: {
                event_name:     'Last.fm',
                event_action:   'track loved'
            }
        }, function(response) {});
    }
    
    if (action == "unloveTrack") 
    {
        var songName    = jQuery(".playerBarSong")[0].textContent,
            artistName  = jQuery(".playerBarArtist")[0].textContent;

        chrome.extension.sendRequest({
            lastfm: 'unlove',
            notificationParams: {
                artistName: artistName,
                songName:   songName,
            }
        }, function(response) {});
        
        chrome.extension.sendRequest({
            notificationType:   'analytics',
            msgParams: {
                event_name:     'Last.fm',
                event_action:   'track unloved'
            }
        }, function(response) {});
    }
    
    if (action == 'hideScrobbleStatus')
    {
        debugLog("PandoraEnhancer - Scrobbler - Logged out");
        jQuery("#scrobbleDiv").remove();
        jQuery("#scrobbleStatus").html('Logged out');
        chrome.extension.sendRequest({
            notificationType:   'analytics',
            msgParams: {
                event_name:     'Last.fm',
                event_action:   'logged out'
            }
        }, function(response) {});
    }
    
    if (action == 'nowPlaying')
    {
        debugLog("PandoraEnhancer - Scrobbler - Now listening...");
        jQuery("#scrobbleStatus").html('Listening...');
    }
    if (action == 'scrobbled')
    {
        debugLog("PandoraEnhancer - Scrobbler - Scrobbled");
        jQuery("#scrobbleStatus").html('Scrobbled');
        chrome.extension.sendRequest({
            notificationType:   'analytics',
            msgParams: {
                event_name:     'Last.fm',
                event_action:   'track scrobbled'
            }
        }, function(response) {});
    }
}

var playerControl = function(action)
{
    switch (action)
    {
        case "thumbs_up":
            dispatchClick(jQuery('.thumbUpButton')[0]);
            
            if (settings.pe.lastfm_love_with_like == "true"){
                debugLog("PandoraEnhancer - Loving on Last.fm");
                scrobbleControl("loveTrack");
            }
            
            debugLog("PandoraEnhancer - Thumbs up, dude!");
            chrome.extension.sendRequest({
                notificationType:   'analytics',
                msgParams: {
                    event_name:     'PE Player Control',
                    event_action:   'thumbs up'
                }
            }, function(response) {});
            break;
        case "thumbs_down":
            dispatchClick(jQuery('.thumbDownButton')[0]);
            debugLog("PandoraEnhancer - Thumbs down :-(");
            chrome.extension.sendRequest({
                notificationType:   'analytics',
                msgParams: {
                    event_name:     'PE Player Control',
                    event_action:   'thumbs down'
                }
            }, function(response) {});
            break;
        case "play":
            dispatchClick(jQuery('.playButton')[0]);
            debugLog("PandoraEnhancer - Play");
            chrome.extension.sendRequest({
                notificationType:   'analytics',
                msgParams: {
                    event_name:     'PE Player Control',
                    event_action:   'play'
                }
            }, function(response) {});
            break;
        case "pause":
            dispatchClick(jQuery('.pauseButton')[0]);
            debugLog("PandoraEnhancer - Pause");
            chrome.extension.sendRequest({
                notificationType:   'analytics',
                msgParams: {
                    event_name:     'PE Player Control',
                    event_action:   'pause'
                }
            }, function(response) {});
            break;
        case "skip":
            var ppskip = jQuery(".unlimitedSkipButton")[0];
            if (ppskip !== undefined){
                dispatchClick(ppskip);
                var skip = "unlimited skip";
            } else {
                dispatchClick(jQuery('.skipButton')[0]);
                var skip = "normal skip";
            }
            debugLog("PandoraEnhancer - Skip");
            chrome.extension.sendRequest({
                notificationType:   'analytics',
                msgParams: {
                    event_name:     'PE Player Control',
                    event_action:   skip
                }
            }, function(response) {});
            break;
        
        case "mute":
            if (jQuery(".volumeKnob").css("left") == "35px") return false;
            volumeLevelRestored = jQuery(".volumeKnob").css("left");
            volumeLevelRestored = volumeLevelRestored.replace("px","");
			volumeLevelRestored = volumeLevelRestored - volumeLevelBase;
            //volumeLevelRestored = Math.ceil((volumeLevelRestored - volumeLevelBase) / volumeLevelIncrement);            
            isMuted = true;
            jQuery('.volumeKnob').simulate("drag", {dx: -150, dy: 0});
            debugLog("PandoraEnhancer - Mute");
            chrome.extension.sendRequest({
                notificationType:   'analytics',
                msgParams: {
                    event_name:     'PE Player Control',
                    event_action:   'mute'
                }
            }, function(response) {});
            break;
        case "unmute":
            //window.location.replace("http://www.pandora.com/#/volume/" + volumeLevelRestored);
			jQuery('.volumeBackground').css('display', 'block');
			jQuery('.volumeKnob').simulate("drag", {dx: volumeLevelRestored, dy: 0});
            isMuted = false;
            debugLog("PandoraEnhancer - Un-mute");
            chrome.extension.sendRequest({
                notificationType:   'analytics',
                msgParams: {
                    event_name:     'PE Player Control',
                    event_action:   'un-mute'
                }
            }, function(response) {});
            break;
            
        default:
            return false;
            break;
    }
};

var hideAds = function()
{
    jQuery("body").css("background-color", "none !important");
    jQuery("#mainContainer").css({"background-image":settings.background_image + " !important", "background-color":settings.background_color});
    jQuery("#mainContentContainer").css("float", "none !important");
    jQuery("#adLayout").css("width", "auto !important"); //bg fix on smaller viewport widths
    ads_hidden++;
    chrome.extension.sendRequest({
        notificationType:   'analytics',
        msgParams: {
            event_name:     'Ads Blocked',
            event_action:   'visual'
        }
    }, function(response) {});
};

var hideVideoAd = function()
{
    //this removes the ad window, but does NOT resume playing music automatically. it takes a few seconds
	chrome.extension.sendRequest({
		notificationType: 'hideVideoAd'
	}, function(response){
		jQuery("#videoPlayerContainer").addClass("hideVideoAd").remove();
		debugLog("PandoraEnhancer - Removing video ad.");
	});
    ads_hidden++;
    chrome.extension.sendRequest({
        notificationType:   'analytics',
        msgParams: {
            event_name:     'Ads Blocked',
            event_action:   'video'
        }
    }, function(response) {});

};

var hideRibbon = function(){
    debugLog("PandoraEnhancer - Hiding ribbon.");
    dispatchClick(jQuery('.account_message_close > a')[0]);
    chrome.extension.sendRequest({
        notificationType:   'analytics',
        msgParams: {
            event_name:     'Ads Blocked',
            event_action:   'ribbon'
        }
    }, function(response) {});
};

var extendStationList = function()
{
    debugLog("PandoraEnhancer - Fixing station list.");
    jQuery('#promobox').remove();
    jQuery('.platformPromo').remove();
    jQuery('.stationListHolder').css('height', '740px !important');
    jQuery('.stationContent').css('height', '100% !important');
    jQuery('.jspContainer').css('height', '100% !important');
    jQuery('#stationSortDate').css('border-radius', '6px !important');
};

var selectableLyrics = function()
{
    //lol they went above and beyond to prevent this. so strange.
    if(jQuery("#PE-copyLyrics").length == 0)
    {
        jQuery(".item.lyrics > .heading").append(
        '<span id="PE-copyLyrics"> - Copy Lyrics to Clipboard</span>'
        ).css({
            cursor: "pointer"
        });
    }

    jQuery(".lyricsText").attr(
    {
        unselectable:   "on",
        onmousedown:    "return true;",
        onclick:        "return true;",
        ondragstart:    "return true;",
        onselectstart:  "return true;",
        onmouseover:    "return true;"
    }).css(
    {
        "-moz-user-select": "auto !important",
        "cursor":           "auto !important"
    }).removeClass("unselectable");    
    debugLog("PandoraEnhancer - Lyrics selectable.");
};

var decensorLyrics = function(lyrics)
{
    if (settings.pe.decensor_lyrics != "false")
    {
        //todo: make this happen when lyrics expand, not just copied from our link. check .showMoreLyrics click or something. and a setting.
        //yeah, they censor "fart". im freakin' dying over here!
        var dirty = ["fuck", "shit", "bitch", "ass", "fart", "nigga", "pussy", "clit", "cock"];
        var nice =  [/f\*\*k/gi, /s\*\*t/gi, /b\*\*ch/gi, /a\*\*/gi, /f\*rt/gi, /n\*\*ga/gi, /p\*\*sy/gi, /cl\*t/gi, /c\*\*k/gi];
        
        for (i = 0; i < dirty.length; i++)
        {
            lyrics = lyrics.replace(nice[i], dirty[i]);
        }
        debugLog("PandoraEnhancer - De-censoring lyrics.");        
        jQuery(".lyricsText").html(lyrics);
        chrome.extension.sendRequest({
        notificationType:   'analytics',
        msgParams: {
            event_name:     'Lyrics',
            event_action:   'de-censored'
        }
    }, function(response) {});
    }
};

var copyLyricsToClipboard = function()
{
    //you need to click the "more lyrics" link. it loads the rest afterwards, it's not just hidden
    dispatchClick(jQuery('.showMoreLyrics')[0]);

    //i really don't like how this is implemented. find the event that fires after it receives the lyrics.        
    setTimeout(function(){
        var lyricsHTML = jQuery(".lyricsText").html();
        
        decensorLyrics(lyricsHTML);
                
        //this preserves line breaks for copy+paste
        var lyrics = lyricsHTML.replace(/(<br>)|(<br \/>)|(<p>)|(<\/p>)/g, "\r\n");
        lyrics += "\nCopied by PandoraEnhancer for Chrome";
                
        chrome.extension.sendRequest({
            copyLyrics: true,
            lyricText: lyrics
        }, function(response){
            if (response.status == "true"){
                alert("Lyrics copied to clipboard!");
            } else {
                alert("Could not copy lyrics...");
            }
        });
    },1000);
    chrome.extension.sendRequest({
        notificationType:   'analytics',
        msgParams: {
            event_name:     'Lyrics',
            event_action:   'copied to clipboard'
        }
    }, function(response) {});
};

var totallyStillListening = function()
{
    debugLog("PandoraEnhancer - Still listening bypass.");
    dispatchClick(jQuery('.still_listening')[0]);
    chrome.extension.sendRequest({
        notificationType:   'analytics',
        msgParams: {
            event_name:     'Ads Blocked',
            event_action:   'still listening'
        }
    }, function(response) {});
};

var doSongChange = function()
{
	jQuery('.playerBarArt').css('position', 'relative');
    var currentAlbumArt = jQuery(".playerBarArt")[0];  

    if(currentAlbumArt != null)
    {
        oldAlbumArt = jQuery(currentAlbumArt).attr("src"); 
    }

    if(currentAlbumArt == null || oldAlbumArt == newAlbumArt)
    {
        if(song_skip_tries < 5)
        {
            song_skip_tries++;
            setTimeout("doSongChange()", 100); //try again in 1/10 of second.
        }
        return;
    }

    debugLog('PandoraEnhancer - Song changed.');

    song_skip_tries = 0;
    setTimeout("showNewSongPopup()", 100);   
};

var showNewSongPopup = function()
{
    newAlbumArt = oldAlbumArt;

    //idunno if it matters, but i prefer artist - song (album) //setting?
    var artistName  = jQuery(".playerBarArtist")[0].textContent,
        songName	= jQuery(".playerBarSong")[0].textContent,
        albumName	= jQuery(".playerBarAlbum")[0].textContent,
        isLiked     = jQuery(".thumbUpButton").hasClass('indicator');

	var time = songTimeInfo();
        
    if(songName == "ad")
    {
        hideVideoAd();
        return false;
    }
    
    if(songName == "audioad")
    {
        debugLog("PandoraEnhancer - Muting audio ad.");
        chrome.extension.sendRequest({
            notificationType: 'songChange',
            msgParams: {
                type:       "normal",
                albumArt:   "images/logo-32.png",
                artistName: "Pandora",
                songName:   "Audio Ad",
                albumName:  "Pandora",
            }
        }, function(response) {});
        return false;
    }

    if (isMuted) playerControl("unmute");
    
    chrome.extension.sendRequest({
        notificationType: 'songChange',
        msgParams: {
            albumArt:		oldAlbumArt,
            artistName:		artistName,
            songName:		songName,
            albumName:		albumName,
            isLiked:		isLiked,
			elapsedTime:	time.elapsedTime
        }
    }, function(response) {});

};

var showStillListeningNotification = function()
{
    chrome.extension.sendRequest({
        notificationType: 'stillListening',
        msgParams: {}
    }, 
    function(response){});
};

var appendHeaderConfig = function()
{
    debugLog("PandoraEnhancer - Appending configure link to user menu.");
    jQuery("#user_menu_dd > ul").append("<li class='menu able' id='PE-config-link'><a href='#'>PandoraEnhancer</a></li>");
};


jQuery(document).ready(function()
{    
    debugLog("PandoraEnhancer loaded.");
    chrome.extension.sendRequest({
        notificationType:   'analytics',
        msgParams: {
            event_name:     'PandoraEnhancer',
            event_action:   'on pandora.com'
        }
    }, function(response) {});
    
    jQuery(".showMoreLyrics").livequery('click', function(){
        setTimeout(function(){
            var lyricsHTML = jQuery(".lyricsText").html();
            decensorLyrics(lyricsHTML);
        },1000);
    });

    if (settings.pe.scrobble_session_key && settings.pe.scrobble_session_key != "null")
    {
        scrobbleControl('showScrobbleStatus');
    }

    if(settings.pe.remove_promobox != "false")
    {
        jQuery("#promobox").live('DOMNodeInserted', function(){
            extendStationList();
        });
		extendStationList();
    }

    jQuery(".volumeButton").live('click', function(){
        playerControl("mute");
    });
    
    jQuery(".volumeButton.muted").live('click', function(){
        playerControl("unmute");
    });
    
    jQuery("#PE-config-link").live('click', function(){
        chrome.extension.sendRequest({
            showSettings: true
        }, function(response){});
        chrome.extension.sendRequest({
            notificationType:   'analytics',
            msgParams: {
                event_name:     'Settings',
                event_action:   'via header menu'
            }
        }, function(response) {});
    });

    if(settings.pe.remove_ribbon != "false")
    {
        jQuery(".pandoraRibbonContainer, .ribbonContent").live('DOMNodeInserted', function(){
            hideRibbon();
        });
    }

    if(settings.pe.header_config && settings.pe.header_config != "false")
    {
        //jQuery(".stationChangeSelectorNoMenu").livequery(function(){
            appendHeaderConfig();
        //});
    }

    if(settings.pe.notification_song_change != "false")
    {
        jQuery('.stationSlides').live('DOMNodeInserted', function(event) {
            doSongChange();
        });
    }

    if(settings.pe.remove_still_listening != "false")
	{
		jQuery('.still_listening_container').live('DOMNodeInserted', function(event) {
			if(jQuery('.still_listening').length > 0)
			{
				if(settings.pe.notification_still_listening != "false")
				{
					showStillListeningNotification();
				}
				setTimeout("totallyStillListening()", 5000);
			}
		});
	}
	
    if(settings.pe.remove_ads != "false")
    {
        jQuery("#mainContentContainer, #mainContainer").livequery(function(){
            hideAds();
        });

        jQuery("#ad_container, #ad_frame, #adContainer, #videoPageInfo, .contextual_help_container").livequery(function(){
            jQuery(this).remove();
            ads_hidden++;
            chrome.extension.sendRequest({
                notificationType:   'analytics',
                msgParams: {
                    event_name:     'Ads Blocked',
                    event_action:   'visual'
                }
            }, function(response) {});
        });

        hideAds();
    }

    if(settings.pe.selectable_lyrics != "false")
    {
        jQuery(".lyricsText").livequery(function(){
            selectableLyrics();
        });

        jQuery("#PE-copyLyrics").live('click', function(){        
            copyLyricsToClipboard();
        });
    }

    if(settings.pe.remove_videos != "false")
    {
        jQuery("#videoPlayerContainer, #videoPlayer").live('DOMNodeInserted', function(event){
            (ads_hidden <= 6) ? ads_hidden++ : hideVideoAd(); //6 are blocked immediately
        });
    }

	if(settings.pe.lastfm_love_with_like == 'true')
	{
		jQuery(".thumbUpButton > a").click(function(){
            debugLog("PandoraEnhancer - Loving on Last.fm");
			scrobbleControl("loveTrack");
		});
	}
});
