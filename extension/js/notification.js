function param(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

var bgPage  = chrome.extension.getBackgroundPage();
var PEjs    = chrome.tabs.connect(parseInt(param('tabID')));

$("#playerControlContainer > div, #playerControlContainer > div img").live('click', function(){
    var action = $(this).prop("id");
    switch (action)
    {
        case "thumbs_up":
        if(!$("#thumbs_up").hasClass('isLiked'))
            {
            $("#thumbs_up").addClass('isLiked');
            $("#thumbs_up").removeClass('playerControl');
            bgPage.window.playerControl("thumbs_up");
        }
        break;
        case "thumbs_down":
            bgPage.window.playerControl("thumbs_down");
            break;
        case "play":
            $(this).hide();
            $("#pause").show();
            bgPage.window.playerControl("play", false);
            break;
        case "pause":
            $(this).hide();
            $("#play").show();
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

$(document).ready(function()
{
    //listener
    PEjs.onMessage.addListener(function(message){
        if (message.timeInfo)
            {
            var elapsedTime     = message.timeInfo.elapsedTime;
            var remainingTime   = message.timeInfo.remainingTime; //unused right now
            var totalTime       = message.timeInfo.totalTime;
            var trackingPercent = (elapsedTime / totalTime) * 100;
            $("#tracking").css("width", trackingPercent + "%");
        }

        if (message.stationList)
            {
            console.log(message.stationList);
        }
    });

    if(param('isLiked') == "true")
        {
        $("#thumbs_up").addClass('isLiked');
        $("#thumbs_up").removeClass('playerControl');
    }

    if (param('autoMute') && param('autoMute') == "true" && param('songName') == "Audio Ad")
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
        if($("#pause").css('display') != 'none')
            {
            bgPage.window.updateNotificationStayOpen('songChange', false);
        }
    });

    setInterval(function(){
        PEjs.postMessage({getTimeInfo: true});
    }, 1500);

    PEjs.postMessage({getStationList: true});
});