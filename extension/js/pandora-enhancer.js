console.log("Pandora Ad Remover Loaded");

var hideAds = function()
{
	console.log('Hiding ads...');
	jQuery("#ad_frame").css({"display":"none !important"});
	jQuery("#ad_container").css({"display":"none !important"});
	jQuery("#mainContainer").css({"background-image":"none !important", "background-color":"#09102a"});
	jQuery("#mainContentContainer").css("float", "none !important");
	console.log('Done.');
};

chrome.extension.sendRequest({}, function(response) { //json
	//console.log("pandora-enhancer.js response: " + response);
});

//set an interval, because pandora sideloads its player after the DOM is done loading
//pandora also changes advertisements often, so this should keep the ads hidden

jQuery(".still_listening").livequery(function(){
	console.log("still listening? doesn't matter. there's no more 40 hour limit!");
	jQuery(this).click();
});

jQuery("#mainContentContainer, #mainContainer, #ad_container, #ad_frame").livequery(function(){
	hideAds();
});