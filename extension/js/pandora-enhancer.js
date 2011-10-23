//init
console.log("Pandora Enhancer loaded.");
chrome.extension.sendRequest({
    showPageAction: true
}, function(response) { //json
    //console.log("pandora-enhancer.js response: " + response);
});


//settings
var settings = {
    background_image:   'http://www.pandora.com/static/valances/pandora/default/skin_background.jpg',
    background_color:   '#09102a'
};


//functions
var hideAds = function()
{
    jQuery("#mainContainer").css({"background-image":settings.background_image + " !important", "background-color":settings.background_color});
    jQuery("#mainContentContainer").css("float", "none !important");
};

var extendStationList = function()
{
	jQuery('#promobox').remove();
	jQuery('.platformPromo').remove();
	jQuery('.stationListHolder').css('height', '740px !important');
	jQuery('.stationContent').css('height', '100% !important');
	jQuery('.jspContainer').css('height', '100% !important');
}

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
        }
    ).css(
        {
            "-moz-user-select": "auto !important",
            "cursor":           "auto !important"
        }
    ).removeClass("unselectable");    
    console.log("lyrics selectable...");
}

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
}

var totallyStillListening = function()
{
    console.log("still listening? doesn't matter. there's no more 40 hour limit!");
    //element - .still_listening
    //event - stillListeningClick
    var still_listening = jQuery('.still_listening')[0];
    var event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);
    still_listening.dispatchEvent(event);    
}



jQuery(document).ready(function()
{        
	jQuery("#stillListeningTmpl").livequery(function(){
        console.log('still_listening livequery event - fire cannons!');
		totallyStillListening();
	});

	jQuery("#mainContentContainer, #mainContainer").livequery(function(){
		hideAds();
	});

	jQuery("#ad_container, #ad_frame, #adContainer, #videoPageInfo").livequery(function(){
		jQuery(this).remove();
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
        jQuery(this).addClass("hideVideoAd").remove(); //this ain't it
        console.log("removing video ad...");
    });

	hideAds();
	extendStationList();
});