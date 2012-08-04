var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-26372393-2']);
_gaq.push(['_trackPageview']);
(function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = 'https://ssl.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

var bgPage  = chrome.extension.getBackgroundPage();
var songInfo = bgPage.window.getCurrentSongInfo();
var PEjs    = chrome.tabs.connect(songInfo.tabID);

$("#playerControlContainer > div, #playerControlContainer > div img").live('click', function(){
    var action = $(this).prop("id");
    
    switch (action)
    {
	case "thumbs_up":
	    if (!$("#thumbs_up").hasClass('isLiked'))
	    {
		pandoraUIControl("thumbUpButton");
		bgPage.window.playerControl("thumbs_up");
	    }
	break;
	case "thumbs_down":
	    if (!$("#thumbs_down").hasClass('isLiked'))
	    {
		pandoraUIControl("thumbDownButton");
		bgPage.window.playerControl("thumbs_down");
	    }
	    break;
	case "play":
	    pandoraUIControl("playButton");
	    bgPage.window.playerControl("play", false);
	    break;
	case "pause":
	    pandoraUIControl("pauseButton");
	    bgPage.window.playerControl("pause");
	    bgPage.window.updateNotificationStayOpen('songChange', true);
	    break;
	case "skip":
	    bgPage.window.playerControl("skip");
	    break;
	case "mute":
	    $(this).hide();
	    $("#unmute").show();
	    bgPage.window.playerControl("mute");
	    break;
	case "unmute":
	    $(this).hide();
	    $("#mute").show();
	    bgPage.window.playerControl("unmute");
	    break;
    }
});


//6/1/2012 - i'm leaving this function name. it makes sense, and if we expand we know which site these are for.
var pandoraUIControl = function(element)
{
    switch (element)
    {
	case "thumbDownButton":
	    $("#thumbs_down").addClass('isLiked').removeClass('playerControl');
	    $("#thumbs_up").addClass('playerControl').removeClass('isLiked');
	    break;
	
	case "thumbUpButton":
	    $("#thumbs_up").addClass('isLiked').removeClass('playerControl');
	    $("#thumbs_down").addClass('playerControl').removeClass('isLiked');
	    break;
	
	case "playButton":
	    $("#play").hide();
	    $("#pause").show();
	    break;
	
	case "pauseButton":
	    $("#pause").hide();
	    $("#play").show();
	    break;
	
	case "volumeButton":
	    $("#mute").hide();
	    $("#unmute").show();
	    break;
	    
	case "volumeButton muted":
	    $("#unmute").hide();
	    $("#mute").show();
	    break;
    }
}

$(document).ready(function()
{
	$("#artistInfo > #songName").html(songInfo.songName);
	$("#artistInfo > #albumName").html("on " + songInfo.albumName);
	$("#artistInfo > #artistName").html("by " + songInfo.artistName);
	
	var album_art = (songInfo.albumArt != "/images/no_album_art.jpg")
		? '<img src="' + songInfo.albumArt + '" width="48" height="48" />'
		: '<img src="images/logo-48.png" width="48" height="48" />';
		
	$("#songInfoContainer > #albumArt").html(album_art);
	
    //listener
    PEjs.onMessage.addListener(function(message){
	if (message.timeInfo)
	{
	    //todo: we can do a p2 style detect active jPlayer object and look at jPlayer->status->currentPercentAbsolute
	    var elapsedTime     = message.timeInfo.elapsedTime;
	    var remainingTime   = message.timeInfo.remainingTime; //unused right now
	    var totalTime       = message.timeInfo.totalTime; //sometimes this is wrong :-(
	    var trackingPercent = (elapsedTime / totalTime) * 100;
	    $("#tracking").css("width", trackingPercent + "%");
	}

	//station list stuff
	/*
	if (message.stationList)
	{
	    if (message.stationList !== null)
	    {
		console.log(message.stationList);
		$.each(message.stationList, function(index, value){
		    var selected = (index == "selected") ? "selected" : "";
		    //$("#station_listing").css("display", "block").append('<option ' + selected + '>' + value + '</option>');
		    $(".station_list dd ul").append('<li><a href="#">' + value + '</a></li>');
		});
	    }
	}
	*/
    });
    
    //get some info
    setInterval(function(){
	try {
	    PEjs.postMessage({getTimeInfo: true});
	} catch (e) {
	    bgPage.notification.cancel();
	}
    }, 1500);
    
    //PEjs.postMessage({getStationList: true});
    
    /* old station list
    $("#station_listing").change(function(){
	var stationName = $(this).val();
	var index = $(this).prop("selectedIndex");
	PEjs.postMessage({changeStation: stationName});
    });
    */
    
    $(".station_list dt a").click(function(){
	$(".station_list dd ul").toggle();
    });

    $(".station_list dd ul li a").live('click', function(){
	var stationName = $(this).html();
	PEjs.postMessage({changeStation: stationName});
	$(".station_list dd ul").hide();
    });
    
    if (songInfo.isLiked)
    {
	$("#thumbs_up").addClass('isLiked');
	$("#thumbs_up").removeClass('playerControl');
    }

    if (songInfo.autoMute && songInfo.songName == "Audio Ad")
    {
	bgPage.window.setAudioAdStatus(true);
	bgPage.window.playerControl("mute");
    } else {
	if (bgPage.window.getAudioAdStatus())
	    bgPage.window.playerControl("unmute");

	bgPage.window.setAudioAdStatus(false);
    }

    $('#notificationContainer').mouseenter(function(event){
	bgPage.window.updateNotificationStayOpen('songChange', true);
    }).mouseleave(function(){
	if ($("#pause").css('display') != 'none')
	{
	    bgPage.window.updateNotificationStayOpen('songChange', false);
	}
    });

});