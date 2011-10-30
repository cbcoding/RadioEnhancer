
//make these settings
var scrobbleKey = 'cc8e53bcccab48d580f4843d5f9593d7';
var scrobbleSecret = '31b129a3ac23f2b171a5a8f4eaf6963a';
var scrobbleUrl = 'http://ws.audioscrobbler.com/2.0/';
var scrobbleSession = {};

var scrobblePayload = {
	timestamp: 0
};

if(localStorage['scrobble_session'] && localStorage['scrobble_session'] != null)
{
	scrobbleSession = JSON.parse(localStorage['scrobble_session']);
}

var responseDispatcher = function(type, payload) 
{
	debugLog(type);
	if(type == 'authenticated')
	{
		getUserSession(payload);
		return;
	}

	if(type == 'requestAuthentication')
	{
		doScrobbleAuth();
		return;
	}

	if(type == 'getSession')
	{
		return scrobbleSession;
	}

	if(type == 'scrobbleLogout')
	{
		logoutUser();
		return;
	}

	if(type == 'loveTrack')
	{
		loveTrack();
		return;
	}

	if(type == 'scrobble')
	{
		scrobblePayload = {
			api_key:	scrobbleKey,
			artist:		payload['artistName'],
			track:		payload['songName'],
			album:		payload['albumName'],
			timestamp:	payload['timestamp'],
			sk:			scrobbleSession['key']
		};

		sendAPIRequest('track.updateNowPlaying', scrobblePayload, 'POST');

		setTimeout("sendScrobble();", 30);
		return;
	}

	if(type == 'unloveTrack')
	{
		unloveTrack();
		return;
	}
};

var sendScrobble = function()
{
	var dateNow = new Date();
	var nowTimestamp = Math.round(dateNow.getTime()/1000);
	if(scrobblePayload['timestamp'] - nowTimestamp > 30 && scrobblePayload.length > 1)
	{
		sendAPIRequest('track.scrobble', scrobblePayload, 'POST');
	}
};

//functions
var sendAPIRequest = function(requestType, requestData, requestMethod, callbackFxn) 
{
    var requestParams = requestData;

    //$.inArray(requestType, ["track.love", "track.scrobble", "track.unlove", "track.updateNowPlaying"]) >= 0 && (requestMethod = "POST");

    requestParams.method = requestType;
    requestParams.api_sig = getSignatureKey(requestData);
	debugLog(requestParams);
    var request = jQuery.ajax({
        url: scrobbleUrl,
        type: requestMethod,
        data: requestParams,
        success: function(response) {
			if(callbackFxn) callbackFxn(response);
        },
        failure: function(response) {
			if(callbackFxn) callbackFxn(response);
        }
    });

	debugLog(request);
};

var getSignatureKey = function(requestData){
	var paramHolder = [];
	var signatureKey = '';

    for(var parameter in requestData)
	{
		paramHolder.push(parameter);
	}

    paramHolder.sort();//must be in alphabetical order.

    for(var paramVal in paramHolder) 
	{
		signatureKey += paramHolder[paramVal] + requestData[paramHolder[paramVal]];
	}

    signatureKey += scrobbleSecret;
    return md5(signatureKey);
}

var doScrobbleAuth = function() 
{
    chrome.tabs.create({
        url: "http://www.last.fm/api/auth/?api_key=" + scrobbleKey + "&cb=" + chrome.extension.getURL("authentication_success.html"),
    });
};

var getUserSession = function(token)
{
	if(token.length == 0) return;

	var requestData = {
		api_key: scrobbleKey,
		token: token
	};
	
	sendAPIRequest('auth.getSession', requestData, 'GET', function(response){
		
		if(response.length == 0) return;
			
		var responseDOM = $(response);

		scrobbleSession = {
			name: responseDOM.find('name').text(),
			key: responseDOM.find('key').text()
		};

		debugLog(scrobbleSession);
		localStorage['scrobble_session'] = JSON.stringify(scrobbleSession);

	});
};

var logoutUser = function()
{
    localStorage['scrobble_session'] = null;
    scrobbleSession = null;
};

//chrome.extension.onRequest.addListener(responseDispatcher);