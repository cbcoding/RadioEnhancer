/**
 * Last.fm Authentication Success
 * Needed it's own javascript file due to Chrome's CSP
 * See: http://developer.chrome.com/extensions/contentSecurityPolicy.html#JSExecution
 */
var bgPage = chrome.extension.getBackgroundPage(),
	token = window.location.search,
	tokenPieces = token.split('=');
	
bgPage.responseDispatcher('authenticated', tokenPieces[1]);