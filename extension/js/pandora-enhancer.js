console.log("Pandora Enhancer loaded.");

//page action icon
chrome.extension.sendRequest({}, function(response) { //json
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
    ).removeClass("unselectable").parents().append(
        //'<div id="PE-copyLyrics">Copy Lyrics to Clipboard</div>'
    );
    
    /*
    jQuery("<div id=\"PE-copyLyrics\">Copy Lyrics to Clipboard</div>").css({
        height:     "auto",
        width:      "auto",
        padding:    "5px",
        border:     "1px solid #012650", //change
        position:   "absolute",
        top:        "200px",
        background: "#09102a",
        "-moz-border-radius": "8px"
    });
    */
}

var copyLyricsToClipboard = function()
{
    //you need to click the "more lyrics" link. it loads the rest afterwards, it's not hidden or something
    //jQuery(".showMoreLyrics").html("BONER!").click();
    
    //remove the <br>'s from the lyrics. if you just use .text(), you get just one long line of lyrics. this preserves line breaks
    var lyrics = jQuery(".lyricsText").html().replace(/(<br>)|(<br \/>)|(<p>)|(<\/p>)/g, "\r\n");
    lyrics += "\nCopied by Pandora Enhancer";
    alert(lyrics);
}



jQuery(document).ready(function(){
	jQuery(".still_listening").livequery(function(){
		console.log("still listening? doesn't matter. there's no more 40 hour limit!");
		jQuery(this).click();
	});

	jQuery("#mainContentContainer, #mainContainer").livequery(function(){
		hideAds();
	});

	jQuery("#ad_container, #ad_frame, #adContainer").livequery(function(){
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
        console.log("removing video ad...");
        jQuery(this).addClass("hideVideoAd").remove(); //nope
        console.log("video ad removed!");
    });

	hideAds();
	extendStationList();
});