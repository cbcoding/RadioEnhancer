console.log("Pandora Ad Remover Loaded");

chrome.extension.sendRequest({}, function(response) { //json
	console.log("pandora-enhancer.js response: " + response);
});

//set an interval, because pandora sideloads its player after the DOM is done loading
//pandora also changes advertisements often, so this should keep the ads hidden


/*
//i'll see if this works later
jQuery("#ad_frame, #ad_container").live(function(){
	$(this).css({"display":"none !important"});
});
*/

jQuery(".still_listening").live(function(){
	console.log("still listening? doesn't matter. there's no more 40 hour limit!");
	$(this).click();
});


setInterval(function(){
	jQuery("#ad_frame").css({"display":"none !important"});
	jQuery("#ad_container").css({"display":"none !important"});
	//console.log("ad frame should be hidden");

	jQuery("#mainContainer").css({"background-image":"none !important", "background-color":"#09102a"});
	jQuery("#mainContentContainer").css("float", "none !important");
	//console.log("mainContainer bg should be set to none");
},250);