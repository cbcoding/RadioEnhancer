console.log("Pandora Enhancer loaded.");

var hideAds = function()
{
    jQuery("#mainContainer").css({"background-image":"none !important", "background-color":"#09102a"});
    jQuery("#mainContentContainer").css("float", "none !important");
};

var extendStationList = function()
{
	jQuery('#promobox').remove();
	jQuery('.platformPromo').remove();
    jQuery(".stationListHolder").css("height", "665px !important");
    jQuery(".jspContainer").css("height", "655px !important");
}

/*chrome.extension.sendRequest({}, function(response) { //json
    //console.log("pandora-enhancer.js response: " + response);
});*/

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

	hideAds();
	extendStationList();
});