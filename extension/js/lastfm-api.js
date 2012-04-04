/***
* PandoraEnhancer LastFM API
*/

var scrobbleKey = 'cc8e53bcccab48d580f4843d5f9593d7';
var scrobbleSecret = '31b129a3ac23f2b171a5a8f4eaf6963a';
var scrobbleUrl = 'http://ws.audioscrobbler.com/2.0/';
var scrobbleSessionKey = null;
var scrobbleSessionName = null;

var scrobbleDelay = 30;

var scrobblePayload = {
	timestamp: 0,
	sk: ''
};

if(localStorage['scrobble_delay'] && localStorage['scrobble_delay'] != 'null')
{
	scrobbleDelay = parseInt(localStorage['scrobble_delay']);
}

if(localStorage['scrobble_session_key'] && localStorage['scrobble_session_key'] != 'null')
{
	scrobbleSessionKey = localStorage['scrobble_session_key'];
	scrobbleSessionName = localStorage['scrobble_session_name'];
}

var responseDispatcher = function(type, payload) 
{
	if(type == 'authenticated')
	{
		getUserSession(payload);
		return;
	}

	if(type == 'requestAuthentication')
	{
		chrome.tabs.create({
			url: "http://www.last.fm/api/auth/?api_key=" + scrobbleKey + "&cb=" + chrome.extension.getURL("authentication_success.html"),
		});
		return;
	}

	if(type == 'scrobbleLogout')
	{
		logoutUser();
		return;
	}

	if(type == 'loveTrack')
	{
        scrobblePayload = {
            api_key:    scrobbleKey,
            sk:         scrobbleSessionKey,
            artist:     payload['artistName'],
            track:      payload['songName']
        }
        sendAPIRequest('track.love', scrobblePayload, 'POST');
		return;
	}
    
    if(type == 'unloveTrack')
    {
        scrobblePayload = {
            api_key:    scrobbleKey,
            sk:         scrobbleSessionKey,
            artist:     payload['artistName'],
            track:      payload['songName']
        }
        sendAPIRequest('track.unlove', scrobblePayload, 'POST');
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
			sk:			scrobbleSessionKey
		};

		sendAPIRequest('track.updateNowPlaying', scrobblePayload, 'POST');
        
        //update "scrobbleStatus" to now playing
        scrobbleAction('nowPlaying');

		if(payload['elapsedTime'] < scrobbleDelay) //only scrobble if we haven't already done it.
		{
			setTimeout("sendScrobble();", (parseInt(scrobbleDelay)+1)*1000);
		}
		return;
	}
};

var sendScrobble = function()
{
	var dateNow = new Date();
	var nowTimestamp = Math.round(dateNow.getTime()/1000);

	if(nowTimestamp - scrobblePayload['timestamp'] >= scrobbleDelay)
	{
		sendAPIRequest('track.scrobble', scrobblePayload, 'POST');
        //update "scrobbleStatus" to scrobbled
        scrobbleAction('scrobbled');        
	}
};

//functions
var sendAPIRequest = function(requestType, requestData, requestMethod, callbackFxn) 
{
	requestData['method'] = requestType;
    var requestParams = requestData;
    requestParams['api_sig'] = getSignatureKey(requestData);

	if(requestType == 'track.scrobble') //we don't want to scrobble twice in a row.
	{
		if(requestParams['artist'] == 'audioad') return;

		if(localStorage['last_scrobble_artist'] && requestParams['artist'] == localStorage['last_scrobble_artist']
			&& localStorage['last_scrobble_track'] && requestParams['track'] == localStorage['last_scrobble_track'])
		{
			return;
		}

		localStorage['last_scrobble_artist'] = requestParams['artist'];
		localStorage['last_scrobble_track'] = requestParams['track'];

	}

    var request = jQuery.ajax({
        url: scrobbleUrl,
        type: requestMethod,
        data: requestParams,
        success: function(response)
		{
			if(callbackFxn) callbackFxn(response);
        },
        failure: function(response)
		{
			if(callbackFxn) callbackFxn(response);
        }
    });

};

var getSignatureKey = function(requestData){
	delete requestData['api_sig'];
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

		scrobbleSessionKey = responseDOM.find('key').text();
		scrobbleSessionName = responseDOM.find('name').text();

		if(scrobblePayload['sk']) scrobblePayload['sk'] = scrobbleSessionKey;

		localStorage['scrobble_session_key'] = scrobbleSessionKey;
		localStorage['scrobble_session_name'] = scrobbleSessionName;
        
        scrobbleAction('showScrobbleStatus');

	});
};

var logoutUser = function()
{
    localStorage['scrobble_session_key'] = null;
	localStorage['scrobble_session_name'] = null;
    scrobbleSessionKey = null;
	scrobbleSessionName = null;
	scrobblePayload['timestamp'] = 0;
    scrobbleAction('hideScrobbleStatus');
};