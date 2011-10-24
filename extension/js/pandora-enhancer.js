//init
console.log("Pandora Enhancer loaded.");
chrome.extension.sendRequest({
    notificationType: 'showPageAction'
}, function(response) { //json
    //console.log("pandora-enhancer.js response: " + response);
});



//settings
var settings = {
    ads_hidden:         0,
    song_skip_tries:    0,
    background_image:   'http://www.pandora.com/static/valances/pandora/default/skin_background.jpg',
    background_color:   '#09102a',
    oldAlbumArt:        '',
    newAlbumArt:        ''
};
//request localStorage settings
chrome.extension.sendRequest({
    notificationType: 'getLocalStorage',
}, function(response){
    settings.pe = response.message;
});


//make these settings
var scrobbleKey = 'cc8e53bcccab48d580f4843d5f9593d7';
var scrobbleSecret = '31b129a3ac23f2b171a5a8f4eaf6963a';
var scrobbleUrl = "http://ws.audioscrobbler.com/2.0/";




//functions
//maybe we should put scrobbling stuff in a new js file - this one is getting pretty long
var sendScrobble = function (songData) {
    var requestParams = songData;
    var requestMethod = 'POST';

    //$.inArray(requestType, ["track.love", "track.scrobble", "track.unlove", "track.updateNowPlaying"]) >= 0 && (requestMethod = "POST");

    requestParams.method = 'track.scrobble';
    requestParams.api_sig = getScrobbleSignature(songData);


    $.ajax({
        url: scrobbleUrl,
        type: requestMethod,
        data: requestParams,
        success: function (data) {
            console.log(data);
        },
        failure: function (data) {
            console.log(data);
        },
    });
}

var getScrobbleSignature = function(songData) 
{
    var scrobbleSignature = '';

    for (var songAttribute in songData) 
    {
        scrobbleSignature += songAttribute + songData[songAttribute];
    }

    scrobbleSignature += scrobbleSecret;
    return md5(scrobbleSignature);
};

var scrobbleAuth =     function() {
    chrome.tabs.create({
        url: "http://www.last.fm/api/auth/?api_key=" + scrobbleKey + "&cb=" + chrome.extension.getURL("scroblr-access-granted.html")
    });
};


var hideAds = function()
{
    if (settings.pe.remove_ads == "false") return false;
    jQuery("body").css("background-color", "none !important");
    jQuery("#mainContainer").css({"background-image":settings.background_image + " !important", "background-color":settings.background_color});
    jQuery("#mainContentContainer").css("float", "none !important");
    settings.ads_hidden++;
};

var hideVideoAd = function()
{
    //this removes the ad window, but does NOT resume playing music automatically. it takes a few seconds
    if (settings.pe.remove_videos == "false") return false;
    chrome.extension.sendRequest({
        notificationType: 'hideVideoAd'
    }, function(response){
        jQuery("#videoPlayerContainer").addClass("hideVideoAd").remove();
        console.log("removing video ad...");
    });
}

var extendStationList = function()
{
    if (settings.pe.remove_promobox == "false") return false;
    jQuery('#promobox').remove();
    jQuery('.platformPromo').remove();
    jQuery('.stationListHolder').css('height', '740px !important');
    jQuery('.stationContent').css('height', '100% !important');
    jQuery('.jspContainer').css('height', '100% !important');
};

var selectableLyrics = function()
{
    //lol they went above and beyond to prevent this. so strange.
    if (settings.pe.selectable_lyrics == "false") return false;
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
    }
    ).css(
    {
        "-moz-user-select": "auto !important",
        "cursor":           "auto !important"
    }
    ).removeClass("unselectable");    
    console.log("lyrics selectable...");
};

var copyLyricsToClipboard = function()
{
    if (settings.pe.selectable_lyrics == "false") return false;
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
    if (settings.pe.remove_still_listening == "false") return false;
    console.log("still listening? doesn't matter. there's no more 40 hour limit!");
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
        settings.oldAlbumArt = jQuery(currentAlbumArt).attr("src"); 
    }

    if(currentAlbumArt == null || settings.oldAlbumArt == settings.newAlbumArt)
        {
        if(settings.song_skip_tries < 5)
            {
            settings.song_skip_tries++;
            setTimeout("doSongChange()", 100); //try again in 1/10 of second.
        }
        return;
    }

    console.log('Song changed.');

    settings.song_skip_tries = 0;
    setTimeout("showNewSongPopup()", 100);
};

var showNewSongPopup = function()
{
    if (settings.pe.notification_song_change == "false") return false;
    settings.newAlbumArt = settings.oldAlbumArt;

    //idunno if it matters, but i prefer artist - song (album) //setting?
    var artistName  = jQuery(".playerBarArtist")[0].textContent,
    songName    = jQuery(".playerBarSong")[0].textContent,
    albumName   = jQuery(".playerBarAlbum")[0].textContent;

    chrome.extension.sendRequest({
        notificationType: 'songChange',
        notificationParams: {
            albumArt:   settings.oldAlbumArt,
            artistName: artistName,
            songName:   songName,
            albumName:  albumName
        }
    }, function(response) {});

};

var showStillListeningNotification = function()
{
    if (settings.pe.notification_still_listening == "false") return false;
    chrome.extension.sendRequest({
        notificationType: 'stillListening',
        notificationParams: {}
    }, 
    function(response){});
};

jQuery(document).ready(function()
{   
    jQuery('.stationSlides').live('DOMNodeInserted', function(event) {
        doSongChange();
    });

    jQuery('.still_listening_container').live('DOMNodeInserted', function(event) {
        if(jQuery('.still_listening').length > 0)
            {
            showStillListeningNotification();
            setTimeout("totallyStillListening()", 5000);
        }
    });

    jQuery("#mainContentContainer, #mainContainer").livequery(function(){
        hideAds();
    });

    jQuery("#ad_container, #ad_frame, #adContainer, #videoPageInfo, .contextual_help_container").livequery(function(){
        jQuery(this).remove();
        settings.ads_hidden++;
    });


    //TODO: do this automatically, without having to mouseover the lyrics
    //monitoring change event does not work
    jQuery(".lyricsText").live('mouseover', function(){
        selectableLyrics();      
    });

    jQuery("#PE-copyLyrics").live('click', function(){        
        copyLyricsToClipboard();
    });

    jQuery("#videoPlayerContainer").livequery(function(){
        (settings.ads_hidden < 7) ? settings.ads_hidden++ : hideVideoAd(); //6 are blocked immediately
    });

    hideAds();
    extendStationList();
});