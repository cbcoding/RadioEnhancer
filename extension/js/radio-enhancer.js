/***
* RadioEnhancer
* by Brandon Sachs and Curt Hostetter
*/

//we can detect if we're in a shortcut-application after all! requires "tab" permissions - chrome.extension.window.type
//http://code.google.com/chrome/extensions/windows.html#tyre-Window
//i forgot why that was something we wanted to detect in the first place...

//init
chrome.extension.sendRequest({
    notificationType: 'showPageAction'
}, function(response) { /* json */ });

//debug & dispatched events
var debugLog = function(text)
{
    if(settings.re.debug_mode == "false") return;
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
	    if (settings.re.notification_show_station_list != "false")
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
    settings.re = response.message;
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
    debugLog("RadioEnhancer - Changing Station");
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
	debugLog("RadioEnhancer - Scrobbler - Logged in");
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
	
	debugLog("RadioEnhancer - Loving on Last.fm");
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
	
	debugLog("RadioEnhancer - Un-loving on Last.fm");
    }
    
    if (action == 'hideScrobbleStatus')
    {
	debugLog("RadioEnhancer - Scrobbler - Logged out");
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
	debugLog("RadioEnhancer - Scrobbler - Now listening...");
	jQuery("#scrobbleStatus").html('Listening...');
    }
    if (action == 'scrobbled')
    {
	debugLog("RadioEnhancer - Scrobbler - Scrobbled");
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

	if (settings.re.lastfm_love_with_like == "true"){
	    scrobbleControl("loveTrack");
	}

	debugLog("RadioEnhancer - Thumbs up, dude!");
	chrome.extension.sendRequest({
	    notificationType:   'analytics',
	    msgParams: {
		event_name:     'RE Player Control',
		event_action:   'thumbs up'
	    }
	}, function(response) {});
	break;
	case "thumbs_down":
	    dispatchClick(jQuery('.thumbDownButton')[0]);
	    debugLog("RadioEnhancer - Thumbs down :-(");
	    chrome.extension.sendRequest({
		notificationType:   'analytics',
		msgParams: {
		    event_name:     'RE Player Control',
		    event_action:   'thumbs down'
		}
	    }, function(response) {});
	    break;
	case "play":
	    dispatchClick(jQuery('.playButton')[0]);
	    debugLog("RadioEnhancer - Play");
	    chrome.extension.sendRequest({
		notificationType:   'analytics',
		msgParams: {
		    event_name:     'RE Player Control',
		    event_action:   'play'
		}
	    }, function(response) {});
	    break;
	case "pause":
	    dispatchClick(jQuery('.pauseButton')[0]);
	    debugLog("RadioEnhancer - Pause");
	    chrome.extension.sendRequest({
		notificationType:   'analytics',
		msgParams: {
		    event_name:     'RE Player Control',
		    event_action:   'pause'
		}
	    }, function(response) {});
	    break;
	case "skip":
	    var ppskip = jQuery(".unlimitedSkipButton");
	    if (ppskip.length > 0){
		dispatchClick(ppskip[0]);
		var skip = "unlimited skip";
	    } else {
		dispatchClick(jQuery('.skipButton')[0]);
		var skip = "normal skip";
	    }

	    debugLog("RadioEnhancer - Skip");
	    chrome.extension.sendRequest({
		notificationType:   'analytics',
		msgParams: {
		    event_name:     'RE Player Control',
		    event_action:   skip
		}
	    }, function(response) {});
	    break;

	//todo: mute/unmute toggle gradually lowers overall volume level. fix.
	case "mute":
	    if (jQuery(".volumeKnob").css("left") == "35px") return false;
	    volumeLevelRestored = jQuery(".volumeKnob").css("left");
	    volumeLevelRestored = volumeLevelRestored.replace("px","");
	    volumeLevelRestored = volumeLevelRestored - volumeLevelBase;
	    //volumeLevelRestored = Math.ceil((volumeLevelRestored - volumeLevelBase) / volumeLevelIncrement);            
	    isMuted = true;
	    jQuery('.volumeKnob').simulate("drag", {dx: -150, dy: 0});
	    debugLog("RadioEnhancer - Mute");
	    chrome.extension.sendRequest({
		notificationType:   'analytics',
		msgParams: {
		    event_name:     'RE Player Control',
		    event_action:   'mute'
		}
	    }, function(response) {});
	    break;
	case "unmute":
	    //window.location.replace("http://www.pandora.com/#/volume/" + volumeLevelRestored);
	    jQuery('.volumeBackground').css('display', 'block');
	    jQuery('.volumeKnob').simulate("drag", {dx: volumeLevelRestored, dy: 0});
	    isMuted = false;
	    debugLog("RadioEnhancer - Un-mute");
	    chrome.extension.sendRequest({
		notificationType:   'analytics',
		msgParams: {
		    event_name:     'RE Player Control',
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
    jQuery("#adLayout").css("width", "666px"); //NUMBAH OF THE BEEEEEEEEEEEEEEEEEEEEEEEAST! \m/
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
	debugLog("RadioEnhancer - Removing video ad.");
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
    debugLog("RadioEnhancer - Hiding ribbon.");
    //dispatchClick(jQuery('.account_message_close > a')[0]);
    jQuery("#pandoraRibbonContainer, .pandoraRibbonContainer, .ribbonContent").remove();
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
    debugLog("RadioEnhancer - Fixing station list.");
    jQuery('#promobox').remove();
    jQuery('.platformPromo').remove();
    jQuery('.stationListHolder').css('height', '703px');
    jQuery('.stationContent').css('height', '100% !important');
    jQuery('.jspContainer').css('height', '100% !important');
    jQuery('#stationSortDate').css('border-bottom-left-radius', '6px');
};

var selectableLyrics = function()
{
    //lol they went above and beyond to prevent this. so strange.
    if(jQuery("#RE-copyLyrics").length == 0)
    {
	jQuery(".item.lyrics > .heading").append(
	    '<span id="RE-copyLyrics"> - Copy Lyrics to Clipboard</span>'
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
    debugLog("RadioEnhancer - Lyrics selectable.");
};

var decensorLyrics = function(lyrics)
{
    //TODO: sometimes they censor song names too from the top right and in the light blue area
    if (settings.re.decensor_lyrics != "false")
    {
	//todo: make this happen when lyrics expand, not just copied from our link. check .showMoreLyrics click or something. and a setting.
	//yeah, they censor "fart". im freakin' dying over here!
	var dirty = ["fuck", "shit", "bitch", "ass", "fart", "nigga", "pussy", "clit", "cock"];
	var nice =  [/f\*\*k/gi, /s\*\*t/gi, /b\*\*ch/gi, /a\*\*/gi, /f\*rt/gi, /n\*\*ga/gi, /p\*\*sy/gi, /cl\*t/gi, /c\*\*k/gi];

	for (i = 0; i < dirty.length; i++)
	{
	    lyrics = lyrics.replace(nice[i], dirty[i]);
	}
	debugLog("RadioEnhancer - De-censoring lyrics.");        
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
	lyrics += "\nCopied by RadioEnhancer for Chrome";

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
    debugLog("RadioEnhancer - Still listening bypass.");
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

    if (currentAlbumArt == undefined) return; //while loading pandora

    if (currentAlbumArt != null)
	{
	oldAlbumArt = jQuery(currentAlbumArt).attr("src"); 
    }

    if (currentAlbumArt == null || oldAlbumArt == newAlbumArt)
	{
	if(song_skip_tries < 20) //album art fix
	    {
	    song_skip_tries++;
	    setTimeout("doSongChange()", 100); //try again in 1/10 of second.
	    return;
	}
    }

    debugLog('RadioEnhancer - Song changed.');

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
	//debugLog("RadioEnhancer - Muting audio ad.");
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

	/*
	chrome.extension.sendRequest({
	notificationType:   'analytics',
	msgParams: {
	event_name:     'Ads Blocked',
	event_action:   'audio'
	}
	}, function(response) {});
	*/

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
    debugLog("RadioEnhancer - Appending configure link to user menu.");
    jQuery("#user_menu_dd > ul").append("<li class='menu able' id='RE-config-link'><a href='#'>RadioEnhancer</a></li>");
};


jQuery.fn.center = function () {
    this.css("position","absolute");
    this.css("top", (($(window).height() - this.outerHeight()) / 2) + $(window).scrollTop() + "px");
    this.css("left", (($(window).width() - this.outerWidth()) / 2) + $(window).scrollLeft() + "px");
    return this;
}

var checkForMessageFromTheCoolDudesWhoMadeThisThing = function()
{
    //todo: make it marked as viewed only on the ok click
    jQuery.ajax({
	    type: 	"get",
	    url	:	"http://cbcoding.com/re.json",
	    dataType: "json",
	    cache: false,
	    success: function(r){
		if (settings.re.last_dev_message < r.msgId || r.msgId == "reset")
		{
		    /*
		    //method 2 - hijack their own shit lol
		    //fucking temporary holy shit
		    setTimeout(function(){
			window.location = "http://www.pandora.com/#/account/Radioenhancer";
			
			//that'll show a window. then clear the current html and inject my own
			var tits = $("#mainContent > .error_page");
			$(tits).find('h2').html("A message from the dudes who developed RadioEnhancer...");
			$(tits).find('p').html('<span style="font-weight:900;">' + r.date + '</span><br>' + r.message);
		    }, 2000);
		    */
		    
		    //method 3 - on-page modal with overlay
		    $("body").prepend(
			//re-overlay
			'<div id="RE-overlay" style="z-index:9998 !important;position:absolute;height:100%;width: 100%;margin:0 auto;background:#000;opacity:.7"></div>'
			
			//modal window
			+'<div id="RE-modal" style="'
			    +'z-index:9999 !important;'
			    +'height:auto;'
			    +'width:420px;'
			    +'color:#000000;'
			    +'background:-webkit-linear-gradient(top, #ffffff 0%,#e5e5e5 100%);'
			    +'border:2px solid #d0d0d0;'
			    +'-webkit-border-radius: 8px;'
			    +'-webkit-box-shadow: 0 0 50px #000;'
			    +'text-align: center;'
			+'">'
			
			    /* top-right X circle close button
			    +'<div id="RE-modal-close" style="'
				+'display: block;'
				+'float: right;'
				+'margin: -10px -15px 0 0;'
				+'padding: 3px;'
				+'border: 4px solid #ffffff;'
				+'-webkit-border-radius: 20px;'
				+'width: 20px; height: 20px;'
				+'text-align: center;'
				+'background: #bfbfbf;'
				+'font-weight: 900; font-size: 13pt;'
				+'cursor: pointer;'
			    +'">X</div>'
			    */
			    
			    +'<div id="RE-modal-header" style="'
				+'display: block;'
				+'text-align: center;'
				+'height:25%; width:250px;'
				+'-webkit-border-radius: 8px;'
				+'padding: 5px;'
							+'margin-left: 85px;'
							+'margin-top: 10px;'
				+'font-weight: 900: font-size: 10pt;'
			    +'">'
				+'<span style="font-size:18pt;font-weight:900;color:#00317f;width:200px;">'
				+'<img style="float:left;" src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ bWFnZVJlYWR5ccllPAAAAyBpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6 eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEz NDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBXaW5kb3dzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjk0RDJERDJGMDM0MzExRTFCRTZGQjZBRDkxREFENDM2IiB4bXBNTTpEb2N1bWVu dElEPSJ4bXAuZGlkOjk0RDJERDMwMDM0MzExRTFCRTZGQjZBRDkxREFENDM2Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6OTREMkREMkQwMzQzMTFFMUJFNkZC NkFEOTFEQUQ0MzYiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6OTREMkREMkUwMzQzMTFFMUJFNkZCNkFEOTFEQUQ0MzYiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1l dGE+IDw/eHBhY2tldCBlbmQ9InIiPz4wxeWBAAAIr0lEQVR42rxXa2wcVxX+5rEv73r9Wnv9qh3bSWM3L5JGaXARqZQIISEVof6paKtILRJUECEIggARUQkS0CKUH1EFoqAKBKhVQa2a0ggRp02VKkkV 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\">'
				+'<div style="height: 32px;margin-top:1px;">RadioEnhancer</div></span>'
			    +'</div>'
			    
			    +'<div id="RE-modal-content" style="'
				+'display: block;'
				+'margin: 0 auto;'
				+'text-align: left;'
				+'padding: 10px 0 30px;'
				+'height:50%; width:90%;'
			    +'">'
				+ '<span style="font-weight:900;">' + r.date + '</span><br>' + r.message
			    +'</div>'
			    
			    
			    +'<div id="RE-modal-close" style="'
				+'display: block;'
				+'text-align: center;'
				+'height:25%; width:100%;'
			    +'">'
				+'<span style="'
				    +'display: block;'
				    +'border: 1px solid #c4c4c4;'
				    +'-webkit-border-radius: 8px;'
				    +'cursor: pointer;'
				    +'font-weight: 900; font-size: 10pt;'
				    +'padding: 10px;'
				    +'background:-webkit-linear-gradient(top, #ffffff 0%,#e5e5e5 100%);'
				    +'width: 200px;'
				    +'-webkit-box-shadow: 0 0 5px #d8d8d8;'
				    +'margin: -10px auto;'
				+'">Close</span>'
			    +'</div>'
			
			+'</div>' //re-modal
		    );
		    
		    $("#RE-modal").center();
		    
		    r.msgId = (r.msgId == "reset") ? "0" : r.msgId;
		    chrome.extension.sendRequest({
			notificationType: 'lastDevMsg',
			msgId:            r.msgId
		    });
		    
		    //analytics
		    chrome.extension.sendRequest({
			notificationType:   'analytics',
			msgParams: {
			    event_name:     'RadioEnhancer',
			    event_action:   'Checked for Message'
			}
		    }, function(response) {});
		}
	    }
    });
}


jQuery(document).ready(function()
{
    debugLog("RadioEnhancer loaded.");
    checkForMessageFromTheCoolDudesWhoMadeThisThing();

	jQuery('.thumbDownButton, .thumbUpButton, .playButton, .pauseButton').live('mouseup', function(){
		var button = jQuery(this);
		chrome.extension.sendRequest({
			notificationType: 'pandoraUI',
			action: button.attr("class")
		});
	});
    
    //todo: wtf is the purpose of this?
    chrome.extension.sendRequest({
	notificationType:   'analytics-pageview',
	msgParams: {
	    url:     '/pandora.com'
	}
    }, function(response) {});

    jQuery(".showMoreLyrics").livequery('click', function(){
	setTimeout(function(){
	    var lyricsHTML = jQuery(".lyricsText").html();
	    decensorLyrics(lyricsHTML);
	},1000);
    });

    if (settings.re.scrobble_session_key && settings.re.scrobble_session_key != "null")
    {
	scrobbleControl('showScrobbleStatus');
    }

    if(settings.re.remove_promobox != "false")
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

    jQuery("#RE-config-link").live('click', function(){
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
    
    jQuery("#RE-modal-close").live('click', function(){
	console.log("closing modal");
	jQuery("#RE-overlay, #RE-modal").remove();
    });

    if(settings.re.remove_ribbon != "false")
	{
	jQuery(".pandoraRibbonContainer, .ribbonContent").live('DOMNodeInserted', function(){
	    hideRibbon();
	});
    }

    if(settings.re.header_config && settings.re.header_config != "false")
	{
	//jQuery(".stationChangeSelectorNoMenu").livequery(function(){
	appendHeaderConfig();
	//});
    }

    if(settings.re.notification_song_change != "false")
	{
	jQuery('.stationSlides').live('DOMNodeInserted', function(event) {
	    doSongChange();
	});
    }

    if(settings.re.remove_still_listening != "false")
    {
	jQuery('.still_listening_container').live('DOMNodeInserted', function(event) {
	    if (jQuery('.still_listening').length > 0)
		{
		if(settings.re.notification_still_listening != "false")
		{
		    showStillListeningNotification();
		}
		setTimeout("totallyStillListening()", 5000);
	    }
	});
    }

    if(settings.re.remove_ads != "false")
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

    if(settings.re.selectable_lyrics != "false")
    {
	jQuery(".lyricsText").livequery(function(){
	    selectableLyrics();
	});

	jQuery("#RE-copyLyrics").live('click', function(){        
	    copyLyricsToClipboard();
	});
    }

    if(settings.re.remove_videos != "false")
    {
	jQuery("#videoPlayerContainer, #videoPlayer").live('DOMNodeInserted', function(event){
	    (ads_hidden <= 6) ? ads_hidden++ : hideVideoAd(); //6 are blocked immediately
	});
    }

    if(settings.re.lastfm_love_with_like == 'true')
	{
	jQuery(".thumbUpButton > a").click(function(){
	    debugLog("RadioEnhancer - Loving on Last.fm");
	    scrobbleControl("loveTrack");
	});
    }
});
