/***
 * RadioEnhancer Background
 */

var timeouts = {};
var openNotifications = {};

var updateNotificationStayOpen = function(type, stayOpen) {
		if(localStorage['notification_always_show'] == "true") return;
		openNotifications[type]['stayOpen'] = stayOpen;
		clearTimeout(timeouts[type]);

		if(!stayOpen) {
			setTimeout(
			(function() {
				closeNotification(type, false);
			}), 2000);
		}
	};

var closeNotification = function(type, force) {
		if(!openNotifications[type]) return;
		if(openNotifications[type]['stayOpen'] && !force) return;

		openNotifications[type]['notification'].cancel();
		delete openNotifications[type];
	};

var openNotification = function(type, notification, force) {
		clearTimeout(timeouts[type]);
		closeNotification(type, true);

		var stay = false;
		if(localStorage['notification_always_show'] == "true" && !force) {
			stay = true;
		}

		openNotifications[type] = {
			notification: notification,
			stayOpen: stay
		};

		openNotifications[type]['notification'].show();
	};

var debugLog = function(whatever) {
		if(!localStorage['debug_mode'] || localStorage['debug_mode'] == "false") return;
		console.log(whatever);
	};

function showPageAction(tabID) {
	chrome.pageAction.show(tabID);
	return {
		'message': 'showing pageaction on tabid ' + tabID
	};
}

function copyLyrics(lyrics) {
	var clip = jQuery("#RE-clipboard-temp");
	clip.val(lyrics);
	clip.select();
	document.execCommand("copy");
	return {
		'status': 'true'
	};
}

function stillListeningNotification() {
	var notification = webkitNotifications.createNotification('images/logo-32.png', 'Still listening...', 'Please wait until music continues...');

	openNotification('stillListening', notification, true);

	timeouts['stillListening'] = setTimeout(function() {
		closeNotification('stillListening', false);
	}, (localStorage["notification_timeout"] * 1000));

	_gaq.push(['_trackEvent', 'Notifications', 'Still Listening (standard)']);

	return {
		'message': 'still-listening'
	};
}

function hideVideoAdNotification() {
	if(localStorage["remove_videos"] != "false") {
		var notification = webkitNotifications.createNotification('images/logo-32.png', 'Video Ad Blocked', 'Please wait until music continues...');

		openNotification('hideVideoAd', notification, true);

		timeouts['hideVideoAd'] = setTimeout(function() {
			closeNotification('hideVideoAd', false);
		}, (localStorage["notification_timeout"] * 1000));

		_gaq.push(['_trackEvent', 'Notifications', 'Video Ad Blocked (standard)']);
	}

	return {
		'message': 'video-ad-hidden'
	};
}


var audio_ad = false;

function setAudioAdStatus(bool) {
	audio_ad = bool;
}

function getAudioAdStatus() {
	return audio_ad;
}


var songinfo, notification_timeout, notification, ad;

function showSongChangeNotification(info) {
	//prevents a bunch of extra popups, when changing stations in particular
	if(songinfo !== undefined && info.songName == songinfo.songName) return false;

	if(info.songName == 'audioad') {
		info.albumArt = 'images/logo-32.png';
		info.artistName = 'Pandora';
		info.songName = 'Audio Ad';
		info.albumName = 'Pandora';
		ad = true;
	} else {
		ad = false;
	}

	if(localStorage["player_controls"] != "true") {
		//standard notifications
		notification = webkitNotifications.createNotification(
		info.albumArt, info.songName, info.artistName + " (" + info.albumName + ")");

		if(ad) {
			_gaq.push(['_trackEvent', 'Notifications', 'Audio Ad Blocked (standard)']);
		} else {
			_gaq.push(['_trackEvent', 'Notifications', 'Song Change (standard)']);
		}
	} else {
		//html notifications are the new shit
		notification = webkitNotifications.createHTMLNotification('notification.html');
		/*
	notification = webkitNotifications.createHTMLNotification(
	    'notification.html?'
	    +'albumArt='+info.albumArt
	    +'&artistName='+info.artistName
	    +'&songName='+info.songName
	    +'&albumName='+info.albumName
	    +'&isLiked='+info.isLiked
	    +'&tabID='+tabID
	    +hidden
	);
	*/

		if(ad) {
			_gaq.push(['_trackEvent', 'Notifications', 'Audio Ad Blocked (HTML)']);
		} else {
			_gaq.push(['_trackEvent', 'Notifications', 'Song Change (HTML)']);
		}

		info.autoMute = (localStorage['auto_mute_audio_ads'] == "true") ? true : false;
		info.tabID = tabID;
		songinfo = info;
	}

	openNotification('songChange', notification, false);

	timeouts['songchange'] = setTimeout(function() {
		closeNotification('songChange', false);
	}, (localStorage["notification_timeout"] * 1000));

	return {
		'message': 'PE Notification shown'
	};
}

//called by notifiction window


function getCurrentSongInfo() {
	return songinfo;
}



function localStorageSettings() {
	var settings = {
		selectable_lyrics: localStorage["selectable_lyrics"],
		decensor_lyrics: localStorage["decensor_lyrics"],
		remove_ads: localStorage["remove_ads"],
		remove_promobox: localStorage["remove_promobox"],
		remove_videos: localStorage["remove_videos"],
		remove_tooltips: localStorage["remove_tooltips"],
		remove_still_listening: localStorage["remove_still_listening"],
		remove_ribbon: localStorage["remove_ribbon"],
		auto_mute_audio_ads: localStorage["auto_mute_audio_ads"],
		notification_timeout: localStorage["notification_timeout"],
		notification_song_change: localStorage["notification_song_change"],
		notification_video_ad: localStorage["notification_video_ad"],
		notification_still_listening: localStorage["notification_still_listening"],
		notification_always_show: localStorage["notification_always_show"],
		notification_show_station_list: localStorage["notification_show_station_list"],
		header_config: localStorage["header_config"],
		player_controls: localStorage["player_controls"],
		debug_mode: localStorage["debug_mode"],
		lastfm_love_with_like: localStorage["lastfm_love_with_like"],
		scrobble_delay: localStorage["scrobble_delay"],
		scrobble_session_key: localStorage["scrobble_session_key"],
		scrobble_session_name: localStorage["scrobble_session_name"],
		last_dev_message: localStorage["last_dev_message"]
	};

	var defaults = {
		selectable_lyrics: true,
		decensor_lyrics: false,
		remove_ads: true,
		remove_promobox: true,
		remove_videos: true,
		remove_tooltips: true,
		remove_still_listening: true,
		remove_ribbon: true,
		auto_mute_audio_ads: true,
		notification_timeout: 3.5,
		notification_song_change: true,
		notification_video_ad: true,
		notification_still_listening: true,
		notification_always_show: false,
		notification_show_station_list: false,
		header_config: true,
		player_controls: true,
		debug_mode: false,
		lastfm_love_with_like: false,
		scrobble_delay: 30,
		scrobble_session_key: null,
		scrobble_session_name: null,
		last_dev_message: 0
	};


	for(var key in settings) {
		if(settings[key] == undefined) {
			settings[key] = defaults[key];
			localStorage[key] = defaults[key];
		}
	}

	return {
		'message': settings
	};
}

var tabID, currentURL;

function refreshPandora() {
	update = {
		url: currentURL,
		selected: true,
		pinned: false
	};
	chrome.tabs.update(tabID, update, function() {});
}


function playerControl(action, hideNotification) {
	chrome.tabs.sendRequest(tabID, {
		'playerControl': action
	}, function(response) {});

	if(action == "pause") {
		clearTimeout(notification_timeout);
	}
}

function ourWebsites(person) {
	if(person == "curt") chrome.tabs.create({
		url: 'http://curthostetter.com'
	});
	if(person == "brandon") chrome.tabs.create({
		url: 'http://brandon-sachs.com'
	});
	if(person == "twitter") chrome.tabs.create({
		url: 'http://twitter.com/RadioEnhancer'
	});
	if(person == "bug") chrome.tabs.create({
		url: 'http://cbcoding.com/?page_id=11'
	});
}

function scrobbleAction(action) {
	chrome.tabs.sendRequest(tabID, {
		scrobbleUpdate: action
	}, function(response) {});
}

function lastDevMsg(id) {
	if(localStorage['last_dev_message'] = id) return true;
	return false;
}

/**
 * Google Analytics
 */
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-26372393-2']);
_gaq.push(['_trackPageview']);
(function() {
	var ga = document.createElement('script');
	ga.type = 'text/javascript';
	ga.async = true;
	ga.src = 'https://ssl.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0];
	s.parentNode.insertBefore(ga, s);
})();

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	var notificationType = request.notificationType;
	var msgParams = request.msgParams;
	var playerControl = request.playerControl;
	var returnStatus = false;
	tabID = sender.tab.id;
	currentURL = sender.tab.url;

	if(notificationType == "pandoraUI") {
		// "syncs" pandora's UI player control state to notification window
		chrome.extension.getViews({
			type: "notification"
		}).forEach(function(notification) {
			notification.pandoraUIControl(request.action);
		});
	}

	if(notificationType == "lastDevMsg") {
		returnStatus = lastDevMsg(request.msgId);
	}

	if(notificationType == 'getLocalStorage') {
		returnStatus = localStorageSettings();
	}

	if(notificationType == 'showPageAction') {
		returnStatus = showPageAction(sender.tab.id);
	}

	if(notificationType == 'stillListening') {
		returnStatus = stillListeningNotification();
	}

	if(notificationType == 'hideVideoAd') {
		returnStatus = hideVideoAdNotification();
	}

	if(notificationType == 'songChange') {
		returnStatus = showSongChangeNotification({
			albumArt: msgParams.albumArt,
			artistName: msgParams.artistName,
			songName: msgParams.songName,
			albumName: msgParams.albumName,
			isLiked: msgParams.isLiked
		});

		if(localStorage["scrobble_session_key"] && localStorage["scrobble_session_key"] != 'null' && msgParams.songName != 'audioad') {
			var dateNow = new Date();
			var timestamp = Math.round(dateNow.getTime() / 1000);
			responseDispatcher('scrobble', {
				artistName: msgParams.artistName,
				songName: msgParams.songName,
				albumName: msgParams.albumName,
				timestamp: timestamp,
				elapsedTime: msgParams.elapsedTime
			});
		}
	}

	if(notificationType == 'analytics') {
		_gaq.push(['_trackEvent', msgParams.event_name, msgParams.event_action]);
	}

	if(notificationType == 'analytics-pageview') {
		_gaq.push(['_trackPageview', msgParams.url]);
	}

	if(notificationType == "showPageAction") {
		returnStatus = showPageAction(sender.tab.id);
	}

	if(!request.notificationType) {
		if(request.lastfmAction) {
			if(request.lastfmAction == 'love') {
				responseDispatcher('loveTrack', {
					artistName: msgParams.artistName,
					songName: msgParams.songName
				});
			}

			if(request.lasfm == 'unlove') {
				responseDispatcher('unloveTrack', {
					artistName: notificationParams.artistName,
					songName: notificationParams.songName,
				});
			}
		}

		if(request.copyLyrics) {
			returnStatus = copyLyrics(request.lyricText);
		}

		if(request.showSettings) {
			chrome.tabs.create({
				url: chrome.extension.getURL('settings.html')
			});
		}

		if(request.autoMuteStatus) {
			returnStatus = getAudioAdStatus();
		}
	}

	sendResponse(returnStatus);
}); //onRequest

$(function() {
	localStorageSettings();

	var ext = chrome.app.getDetails();
	var version = ext.version;

	if(typeof localStorage['version'] == 'undefined') {
		localStorage['version'] = version;
		_gaq.push(['_trackEvent', 'RadioEnhancer', 'Installed v' + version]);
	}

	if(localStorage['version'] < version) {
		localStorage['version'] = version;
		_gaq.push(['_trackEvent', 'RadioEnhancer', 'Upgraded to v' + version]);
	}
});