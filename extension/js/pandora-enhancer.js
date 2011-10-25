//init
chrome.extension.sendRequest({
    notificationType: 'showPageAction'
}, function(response) { //json
    //<br />("pandora-enhancer.js response: " + response);
});

//settings
var settings = {
    background_image:   'http://www.pandora.com/static/valances/pandora/default/skin_background.jpg',
    background_color:   '#09102a'
};

var oldAlbumArt = null;
var newAlbumArt = null;
var ads_hidden = 0;
var song_skip_tries = 0;

//request localStorage settings
chrome.extension.sendRequest({
    notificationType: 'getLocalStorage',
}, function(response){
    settings.pe = response.message;
});

var debugLog = function(text)
{
	if(settings.pe.debug_mode == "false") return;
	console.log(text);
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
        debugLog("removing video ad...");
    });
}

var extendStationList = function()
{
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
    debugLog("lyrics selectable...");
};

var copyLyricsToClipboard = function()
{
    //you need to click the "more lyrics" link. it loads the rest afterwards, it's not just hidden
    //could also monitor ajax events, but i can't find which one receives the continued lyrics
    var link = jQuery('.showMoreLyrics')[0];
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    link.dispatchEvent(event);

    //i really don't like how this is implemented. find the event that fires after it receives the lyrics.        
    setTimeout(function(){
        //remove the <br>'s from the lyrics. if you just use .text(), you get just one long line of lyrics. this preserves line breaks
        var lyrics = jQuery(".lyricsText").html().replace(/(<br>)|(<br \/>)|(<p>)|(<\/p>)/g, "\r\n");
        lyrics += "\nCopied by Pandora Enhancer for Chrome";

        chrome.extension.sendRequest({
            copyLyrics: true,
            lyricText: lyrics
        }, function(response){
            alert("Lyrics copied to clipboard!");
        });
    },1000);
};

var totallyStillListening = function()
{
    debugLog("still listening? doesn't matter. there's no more 40 hour limit!");
    var still_listening = jQuery('.still_listening')[0];
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    still_listening.dispatchEvent(event);    
};

var doSongChange = function()
{
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

    debugLog('Song changed.');

    song_skip_tries = 0;
    setTimeout("showNewSongPopup()", 100);
};

var showNewSongPopup = function()
{
	newAlbumArt = oldAlbumArt;

    //idunno if it matters, but i prefer artist - song (album) //setting?
    var artistName  = jQuery(".playerBarArtist")[0].textContent,
    songName		= jQuery(".playerBarSong")[0].textContent,
    albumName		= jQuery(".playerBarAlbum")[0].textContent;

    chrome.extension.sendRequest({
        notificationType: 'songChange',
        notificationParams: {
            albumArt:   oldAlbumArt,
            artistName: artistName,
            songName:   songName,
            albumName:  albumName
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

jQuery(document).ready(function()
{   
	debugLog("Pandora Enhancer loaded.");

	if(settings.pe.notification_song_change != "false")
	{
		jQuery('.stationSlides').live('DOMNodeInserted', function(event) {
			doSongChange();
		});
	}

	if(settings.pe.notification_still_listening != "false")
	{
		jQuery('.still_listening_container').live('DOMNodeInserted', function(event) {
			if(jQuery('.still_listening').length > 0)
			{
				showStillListeningNotification();
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
		jQuery(".lyricsText").live('DOMNodeInserted', function(){
			selectableLyrics();
		});

		jQuery("#PE-copyLyrics").live('click', function(){        
			copyLyricsToClipboard();
		});
	}
	
	if(settings.pe.remove_videos != "false")
	{
		jQuery("#videoPlayerContainer").live('DOMNodeInserted', function(event){
			(ads_hidden <= 6) ? ads_hidden++ : hideVideoAd(); //6 are blocked immediately
		});
	}

	if(settings.pe.remove_promobox != "false")
	{
		extendStationList();
	}
});