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

//listener
chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
    if (request.playerControl)
    {
        playerControl(request.playerControl);
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

//settings
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
        
        /*
        jQuery(".rightcolumn > .nowplaying").append(
            '<div class="info" id="scrobbleDiv" style="float:left; margin-top:-45px; margin-left:-75px;">'
            +'<div style="float: left;height:16px;"><img src="' + scrobbleImage + '"></div>'
            +'<div id="scrobbleStatus" style="float: left;margin:0 5px;text-align:right;"></div>'
            +'</div>'
        );
        */
    }
    
    if (action == 'hideScrobbleStatus')
    {
        debugLog("PandoraEnhancer - Scrobbler - Logged out");
        jQuery("#scrobbleDiv").remove();
        jQuery("#scrobbleStatus").html('Logged out');
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
    }
}

var playerControl = function(action)
{
    switch (action)
    {
        case "thumbs_up":
            dispatchClick(jQuery('.thumbUpButton')[0]);
            debugLog("PandoraEnhancer - Thumbs up, dude!");
            break;
        case "thumbs_down":
            dispatchClick(jQuery('.thumbDownButton')[0]);
            debugLog("PandoraEnhancer - Thumbs down :-(");
            break;
        case "play":
            dispatchClick(jQuery('.playButton')[0]);
            debugLog("PandoraEnhancer - Play");
            break;
        case "pause":
            dispatchClick(jQuery('.pauseButton')[0]);
            debugLog("PandoraEnhancer - Pause");
            break;
        case "skip":
            dispatchClick(jQuery('.skipButton')[0]);
            debugLog("PandoraEnhancer - Skip");
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
            break;
        case "unmute":
            //window.location.replace("http://www.pandora.com/#/volume/" + volumeLevelRestored);
			jQuery('.volumeBackground').css('display', 'block');
			jQuery('.volumeKnob').simulate("drag", {dx: volumeLevelRestored, dy: 0});
            isMuted = false;
            debugLog("PandoraEnhancer - Un-mute");
            break;
            
        default:
            return false;
            break;
    }
};

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

var hideAds = function()
{
    jQuery("body").css("background-color", "none !important");
    jQuery("#mainContainer").css({"background-image":settings.background_image + " !important", "background-color":settings.background_color});
    jQuery("#mainContentContainer").css("float", "none !important");
    ads_hidden++;
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

};

var hideRibbon = function(){
    debugLog("PandoraEnhancer - Hiding ribbon.");
    dispatchClick(jQuery('.account_message_close > a')[0]);
};

var extendStationList = function()
{
    debugLog("PandoraEnhancer - Fixing station list.");
    jQuery('#promobox').remove();
    jQuery('.platformPromo').remove();
    jQuery('.stationListHolder').css('height', '740px !important');
    jQuery('.stationContent').css('height', '100% !important');
    jQuery('.jspContainer').css('height', '100% !important');

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

var copyLyricsToClipboard = function()
{
    //you need to click the "more lyrics" link. it loads the rest afterwards, it's not just hidden
    dispatchClick(jQuery('.showMoreLyrics')[0]);

    //i really don't like how this is implemented. find the event that fires after it receives the lyrics.        
    setTimeout(function(){
        var lyricsHTML = jQuery(".lyricsText").html();
        
        /*
        //func - this is not working 100%
        //yeah, they censor "fart". im freakin' dying over here!
        var dirty = ["fuck", "shit", "bitch", "ass", "fart", "nigga", "pussy"];
        var nice =  ["f**k", "s**t", "b**ch", "a**", "f*rt", "n**ga", "p**sy"];
        
        for (i = 0; i < dirty.length; i++)
        {
            lyricsHTML = lyricsHTML.replace(/nice[i]/gi, dirty[i]);
        }
        debugLog("PandoraEnhancer - De-censoring lyrics.");        
        jQuery(".lyricsText").html(lyricsHTML);
        //endfunc
        */
        
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
};

var totallyStillListening = function()
{
    debugLog("PandoraEnhancer - Still listening bypass.");
    dispatchClick(jQuery('.still_listening')[0]);
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

	var elapsedTime = jQuery(".elapsedTime").html();
	elapsedTime = elapsedTime.split(':');
	elapsedTime = (elapsedTime[0]*60) + elapsedTime[1];
        
    if(songName == "ad")
    {
        hideVideoAd();
        return false;
    }
    
    if(songName == "audioad")
    {
        //todo: auto mute? lol
        //playerControl("mute");
        //debugLog("PandoraEnhancer - Muting audio ad.");
        chrome.extension.sendRequest({
            notificationType: 'songChange',
            notificationParams: {
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
        notificationParams: {
            albumArt:		oldAlbumArt,
            artistName:		artistName,
            songName:		songName,
            albumName:		albumName,
            isLiked:		isLiked,
			elapsedTime:	elapsedTime
        }
    }, function(response) {});

};

var showStillListeningNotification = function()
{
    chrome.extension.sendRequest({
        notificationType: 'stillListening',
        notificationParams: {}
    }, 
    function(response){});
};

var appendHeaderConfig = function()
{
    debugLog("PandoraEnhancer - Appending configure link to header.");
    jQuery(".stationChangeSelectorNoMenu").css({"width":"auto !important", "margin-left":"-65px"});
    jQuery("#brandingBar > .middlecolumn").append("<span id='PE-config-link'>Configure PandoraEnhancer</span>");
    jQuery("#brandingBar .rightcolumn").css("width","auto");
    jQuery("#PE-config-link").css({"cursor":"pointer"});
};


jQuery(document).ready(function()
{    
    debugLog("PandoraEnhancer loaded.");
    
    jQuery(".toastContainer").live('DOMNodeInserted', function(){
        //TODO: notification on song skip limit?
        //debugLog("PandoraEnhancer - Song skip limit reached (probably).");
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
    });

    if(settings.pe.remove_ribbon != "false")
    {
        jQuery(".pandoraRibbonContainer, .ribbonContent").live('DOMNodeInserted', function(){
            hideRibbon();
        });
    }

    if(settings.pe.header_config && settings.pe.header_config != "false")
    {
        jQuery(".stationChangeSelectorNoMenu").livequery(function(){
            appendHeaderConfig();
        });
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
});
