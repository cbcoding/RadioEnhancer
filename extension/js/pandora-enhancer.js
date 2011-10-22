console.log("Pandora Enhancer loaded.");

//page action icon
chrome.extension.sendRequest({
    showPageAction: true
}, function(response) { //json
    //console.log("pandora-enhancer.js response: " + response);
});

var hideAds = function()
{
    jQuery("#mainContainer").css({"background-image":"none !important", "background-color":"#09102a"});
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
    console.log("lyrics selectable...");
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
}

var copyLyricsToClipboard = function()
{
    //you need to click the "more lyrics" link. it loads the rest afterwards, it's not just hidden
    //jQuery(".showMoreLyrics").triggerHandler("showMoreLyricsClick");
    
    var link = jQuery('.showMoreLyrics')[0];
    var event = document.createEvent('MouseEvents');
    event.initEvent( 'click', true, true );
    link.dispatchEvent(event);
    
    setTimeout(function(){
        //this is a temporary way to do this, as you need to wait for the animation to complete for some reason.
        //or i may be wrong about that. whatever.
        
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



jQuery(document).ready(function(){
	jQuery(".still_listening").livequery(function(){
		console.log("still listening? doesn't matter. there's no more 40 hour limit!");
		jQuery(this).click();
	});

	jQuery("#mainContentContainer, #mainContainer").livequery(function(){
		hideAds();
	});

	jQuery("#ad_container, #ad_frame, #adContainer, #videoPageInfo").livequery(function(){
		jQuery(this).remove();
	});
    
    jQuery(".lyricsText").live('mouseover', function(){
        selectableLyrics();
        
        if (jQuery("#PE-copyLyrics").length == 0)
        {
            jQuery(".item.lyrics > .heading").append(
                '<span id="PE-copyLyrics"> - Copy Lyrics to Clipboard</span>'
            ).css({
                cursor: "pointer"
            });
        }        
    }).live('mouseout', function(){
        //jQuery("#PE-copyLyrics").remove();
        //console.log("removing copyLyrics div");
    });
    
    jQuery("#PE-copyLyrics").live('click', function(){        
        copyLyricsToClipboard();
    });
    
    jQuery("#videoPlayerContainer").livequery(function(){
        jQuery(this).addClass("hideVideoAd").remove(); //nope
        console.log("removing video ad...");
    });

	hideAds();
	extendStationList();
});