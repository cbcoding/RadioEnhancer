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
    if (settings.re.debug_mode == "false") return;
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
var volumeLevelBase = 20;
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
	    isMuted = true;
	    
	    volumeLevelRestored = jQuery(".volumeKnob").css("left");
	    volumeLevelRestored = volumeLevelRestored.replace("px","");
	    volumeLevelRestored = volumeLevelRestored - volumeLevelBase;
	    
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
	    isMuted = false;
	    jQuery('.volumeBackground').css('display', 'block');
	    jQuery('.volumeKnob').simulate("drag", {dx: volumeLevelRestored, dy: 0});
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
    if (jQuery("#RE-copyLyrics").length == 0)
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
	if (song_skip_tries < 20) //album art fix
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
	songName    = jQuery(".playerBarSong")[0].textContent,
	albumName   = jQuery(".playerBarAlbum")[0].textContent,
	isLiked     = jQuery(".thumbUpButton").hasClass('indicator');

    var time = songTimeInfo();

    if (songName == "ad")
	{
	hideVideoAd();
	return false;
    }

    if (songName == "audioad")
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

	chrome.extension.sendRequest({
	    notificationType:   'analytics',
	    msgParams: {
		event_name:     'Ads Blocked',
		event_action:   'audio'
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
    debugLog("RadioEnhancer - Appending configure link to user menu.");
    jQuery("#user_menu_dd > ul").append("<li class='menu able' id='RE-config-link'><a href='#'>RadioEnhancer</a></li>");
};


jQuery.fn.center = function () {
    this.css("position","fixed");
    this.css("top", (($(window).height() - this.outerHeight()) / 2) + $(window).scrollTop() + "px");
    this.css("left", (($(window).width() - this.outerWidth()) / 2) + $(window).scrollLeft() + "px");
    return this;
}

var checkForMessageFromTheCoolDudesWhoMadeThisThing = function()
{
    jQuery.ajax({
	    type:     "get",
	    url	:     "http://cbcoding.com/re.json",
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
			'<div id="RE-overlay" style="z-index:9998 !important;position:fixed;height:100%;width: 100%;margin:0 auto;background:#000;opacity:.7"></div>'
			
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
				+'<img style="float:left;" src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo5MDI3OUQxQjQxMDNFMTExOTdEMUQ3OTk0QjdGN0VBMCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDoyMkRGM0MzMEFFNzYxMUUxQTdERUQwMDJCMzgyQUZDQSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoyMkRGM0MyRkFFNzYxMUUxQTdERUQwMDJCMzgyQUZDQSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IFdpbmRvd3MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo2OTA3QTJGNzc1QUVFMTExQjgwMjhEQ0M1MDBCQkU4RCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5MDI3OUQxQjQxMDNFMTExOTdEMUQ3OTk0QjdGN0VBMCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PqtJuRoAAAhuSURBVHjavFdrbBTXGT2zM/vetb3rF34EYzA2BpvQRilJHWhMGkWVLLVU+VGJppS0IiQQpIoqkSKFVFXFo6hVFdQWmgaB0qalpgoItzRpid0YAhgbBygYMG/YNbDetde7O7vz7nfvrl84kPKjjHQZs3Pnfuc73/nOvSO8/c5fQg67FFA1XRUEPJTLsgCK6aCYQ5JpWcUzqirs+Xl+N/BwEBiGgehQHFeu3ZQkOZ1JuF2eoNfrg26YDwWAomiQk0mw2JKq6oKiqkgk0/B5nESPxUj6wkViwynYbDYi7cFZS6USiMeHwWJLVAdL002efeOc6Q+0UCIpI3wripu3hwi4AIEB+h8uTTOgahpYbAJgEAAdOo22fx1DZYkP9XU1cDqduHr1Ko4c7cLwSIoLRxRtcEgi6mpnor6+HoFAAHU1HjxSUYJjPWeQTBuwS3Z8kZZ0TedlYLFtCiHR6AdCQyCI2pEMD84n0g+JlIxUhrQhkUYlHxTLic/6ruPChYsYHBzk8zxuJ6oqghiKRpFJK2AJ3W+w7BVNBYstKSorgcGDmbxFxDGkAtXXLtoh2UV4/QE4nE7OhEkqPn8tgsKiIni9XrjdbspchASmpRF4vH7+7r0ulqxKDLDYEgW32A/Zuui4HVUm9KtF2iBglo3qK9Gwc3JtBMrQRVwPR1Ezq5rPZUAsU0U8oUJgoHkp7qUBXn+w2FKGkHBqWClUjfRvTQZA7KgqGxplJU5aKBwZmfR/JzGVGInB5fLC6bpPG9JaiqIgo+iQVJ1KwESharw2kx3L4qVRVYsGZWYTx5wsex/3jVgsRpqIUovJ8GUyRJM0JfBoVZgR6aZFzFoWaYBKoBIDdqZMddILpmnyEtAcMK/AXQyUFuWPsxEOYzA2TIuLHLSmE2N3dQNj16LAciqNoeE4BqK6KTEkHJGRbcW7L5P8Qc+1qShOfl5Y4OX3SCSCK1eu4M7gMNz+Ql5fK53hwShLSsTibLKEDBrx4SHcjgwhlhBMKSFnrCRNZvTIaWUKAxklg2RSgcubhqrn8qASBPO9ePLxBj7v4MGD6Oruxa2YglLRB3FEpgqo9/YB0pVp0qC+kaLDSZPZsECLJomaiRczmmCwEH2XL8DhkeHUssUvDvrxfMsiOB127Nq1C52HPkU4mkF+oJha1k1ZE3gKck8AhsFZYfMk9o8xgeaJV1lZGZ595mlUV88kD3BTq3kwY3o5SouD/PmmTZvQ1XMaac2GyJ0BXLt8Hl9+8ut87n2dkMAZowAsEopBdOjcESd3wa1btxAdvENiy+Ngpk2bNvbs5KlT6PqsH7JuRzQSRlVZPhobn8LWrVvxzWU/gj+/YJIlM8qZOQmCjcdi5WWxxxkwjCkMDAwM4L0/7sb1UASSw4mSwgJ89ztL0dAwD4/On4+tv/wZtm5/D237+1FRMQerVq3CyZMncaRjPxY/9zyZkYO8RcF/eg+j+9ABHnTlj7dwwTMxstg2DoC1G7fj7Bi92HZrtzuRIdezSFyDCQut+z6GLMucrcJgAL/avB7JeAx79+7FmTNn8Pt330XdzDIcad/P5xw//CHmzSpBa2srAZKQltPkoiYHMw4gp4HRzWLiXiDZJZ6925sHb14Qg0kD5/qvkeGksHPnTrS0tOC1da9Ct+xYv349ebyC5uZmnD99DH2nuiAZI1i2bBk2btyI2Q0LqUVVaJyBUREix4CBz/UBvvmYWYNmNRPJ4/+8rx1PPL6A+0cikcDq1at5Cec3NkIk1ph27A43YqEzWLt2LZYvX06baRBzHn2Mr2VwEZp887Pd3QVTQeSMauy5gZGUgo7OLixduhQdHR3Ytm0bvrZ4MYqqqnBbFLFw4UI0zK3DkiVLsGHDBgTL61D/pUWcRWY4fOfNlYBEKHA0hqnfg4FRAKRi2/jzd97/G373i9exefNmrFu3Do81NcEke/U7HXj7gw/wh7lzsXzFCkieQgRLKqk1PXxHzQpez/oAMWqzco7HQVCgObMqpgAwc88mDrYz7j/QgZUrV6KzsxMzy8tx6cYNCCdOoJuE+OnNG1j/xhv4xjNfRUfbLoSunR9bh9m7aZm8rLwE5oQucLscY8GnT58Ov883oU3HBxPRXw8cJqtWsWfPHuyn0fryKuxdsAA/efNN/OnXv0VVbS1+8OKL2LFjBy6d7kRf76Hs+xyENbELLH7KYehanm0aA1BQUIBX16xCQZ6Hm8fdLNDrWPHDl/H+9u04/tZbaKL94FtHjyLiz8Phjz5ETE7h8qVL1K5B7N69G9HwOVw5fyLLQq4LhMJFq0NPzysrl4wMfrN5HQIF+ejp6eFKFklQJSUl/N5xuBdtB7t5F4wet8JX+3Cx92N0vv4aantO4dv//Ds+oQxXvPQSBuj9oXgca+jvs2fP0ilKxOzZs/F90kV5dSNs/jLE3VVhIfAUAZhbWi7qGTwxfwa6u48jnU7yrdTijSfA4XBAhx2RuEYnHR9fjF3H21ux67lmNA/G0dL+EY6QiMuqqjGnvgGBYBHa2zswr64Kq195hWftcrmQIhNra2vDP/59AqheEuZ7gZltduw7eByKnCS6lUlHMzpEUX9LcLg8MJh4TCG3qag490kHfno7gpMUvOiRWvhLZuBOUkBUjqOyZgH6r1/Ez7dswfdeeAF9fX0Ik72HQiFomSRE0xSE/KY1N+aXOSv1RARKRqbFjdzX0dTzFKPeJox/DUVCF3Gjvxf+QCnyC8uQR3fR7iALF8eclK3E5rhEDSXFxbjQ3w/B7oErUAm19CshIa9pjZxvk91GPMwzf/AvXQJsmtnjF7kg2+0+ZxYy8TtID4fg9BXB4SuE4JsGzVeZlijZy8OGpxy+mvT/9Ys0YMFpGkSJCY2dLW0iOzeH/yvAAMmoS3BZRl6TAAAAAElFTkSuQmCC\">'
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
			    
			    
			    +'<div id="RE-modal-close" data-message-id="' + r.msgId + '" style="'
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
		    
		    //analytics
		    chrome.extension.sendRequest({
			notificationType:   'analytics',
			msgParams: {
			    event_name:     'RadioEnhancer',
			    event_action:   'Displayed Message'
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
    
    jQuery('.thumbDownButton, .thumbUpButton, .playButton, .pauseButton, .volumeButton').on('mouseup', function(){
	var button = jQuery(this);
	chrome.extension.sendRequest({
	    notificationType: 'pandoraUI',
	    action: button.attr("class")
	});
    });
    
    //wtf is the purpose of this?
    chrome.extension.sendRequest({
	notificationType:   'analytics-pageview',
	msgParams: {
	    url:     '/pandora.com'
	}
    }, function(response) {});

    jQuery(".showMoreLyrics").on('click', function(){
	setTimeout(function(){
	    var lyricsHTML = jQuery(".lyricsText").html();
	    decensorLyrics(lyricsHTML);
	},1000);
    });

    if (settings.re.scrobble_session_key && settings.re.scrobble_session_key != "null")
    {
	scrobbleControl('showScrobbleStatus');
    }

    if (settings.re.remove_promobox != "false")
    {
	jQuery("#promobox").on('DOMNodeInserted', function(){
	    extendStationList();
	});
	extendStationList();
    }

    jQuery(".volumeButton").on('click', function()
    {
	if ($(this).hasClass('muted')){
	    playerControl('unmute');
	} else {
	    playerControl('mute');
	}
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
	var messageId = $(this).data('messageId');
	
	//save last seen message id
	chrome.extension.sendRequest({
	    notificationType: 'lastDevMsg',
	    msgId:            (messageId == "reset") ? "0" : messageId
	});
	
	jQuery("#RE-overlay, #RE-modal").remove();
    });

    if (settings.re.remove_ribbon != "false")
    {
	jQuery(".pandoraRibbonContainer, .ribbonContent").live('DOMNodeInserted', function(){
	    hideRibbon();
	});
    }

    if (settings.re.header_config && settings.re.header_config != "false")
    {
	appendHeaderConfig();
    }

    if (settings.re.notification_song_change != "false")
    {
	jQuery('.stationSlides').live('DOMNodeInserted', function(event) {
	    doSongChange();
	});
    }

    if (settings.re.remove_still_listening != "false")
    {
	jQuery('.still_listening_container').live('DOMNodeInserted', function(event) {
	    if (jQuery('.still_listening').length > 0)
	    {
		if (settings.re.notification_still_listening != "false"){
		    showStillListeningNotification();
		}
		
		setTimeout("totallyStillListening()", 5000);
	    }
	});
    }

    if (settings.re.remove_ads != "false")
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

    if (settings.re.selectable_lyrics != "false")
    {
	jQuery(".lyricsText").livequery(function(){
	    selectableLyrics();
	});

	jQuery("#RE-copyLyrics").live('click', function(){        
	    copyLyricsToClipboard();
	});
    }

    if (settings.re.remove_videos != "false")
    {
	jQuery("#videoPlayerContainer, #videoPlayer").live('DOMNodeInserted', function(event){
	    (ads_hidden <= 6) ? ads_hidden++ : hideVideoAd(); //6 are blocked immediately
	});
    }

    if (settings.re.lastfm_love_with_like == 'true')
    {
	jQuery(".thumbUpButton > a").click(function(){
	    debugLog("RadioEnhancer - Loving on Last.fm");
	    scrobbleControl("loveTrack");
	});
    }
});
