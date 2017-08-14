/// Static variables
var defaultGlobalBlockedParams = "utm_source, utm_medium, utm_term, utm_content, utm_campaign, utm_reader, utm_place, ga_source, ga_medium, ga_term, ga_content, ga_campaign, ga_place, yclid, _openstat, fb_action_ids, fb_action_types, fb_ref, fb_source, action_object_map, action_type_map, action_ref_map"; // From Pure URL
var enabled = true;

/// Preferences
var neat_url_blocked_params; // this is an array!
var neat_url_icon_animation; // none, missing_underscore, rotate or surprise_me

function init(){
	var valueOrDefault = function(value, defaultValue){
		if(value == undefined)
			return defaultValue;
		return value;
	}
	
	var valueOrDefaultArray = function(value, defaultValue){
		var calcValue = valueOrDefault(value, defaultValue);
		return calcValue.split(" ").join("").split(",");
	}
	
	browser.storage.local.get([
		"neat_url_blocked_params",
		"neat_url_icon_animation"
	]).then((result) => {
		//console.log("background.js neat_url_blocked_params " + result.neat_url_blocked_params);
		neat_url_blocked_params = valueOrDefaultArray(result.neat_url_blocked_params, defaultGlobalBlockedParams);
		//console.log("background.js neat_url_icon_animation " + result.neat_url_icon_animation);
		neat_url_icon_animation = valueOrDefault(result.neat_url_icon_animation, "missing_underscore");
	}).catch(console.error);
	
	initBrowserAction();
	initContextMenus();
}
init();

///Messages
// listen for messages from the content or options script
browser.runtime.onMessage.addListener(function(message) {
	switch (message.action) {
		case "refresh-options":
			init();
			break;
		case "notify":
			notify(message.data);
			break;
		default:
			break;
	}
});

// See also https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/Tabs/sendMessage
/*function sendMessage(action, data, errorCallback){
	function logTabs(tabs) {
		for (tab of tabs) {
			browser.tabs.sendMessage(tab.id, {"action": action, "data": data}).catch(function(){
				onError("failed to execute " + action + "with data " + data);
				if(errorCallback) errorCallback(data);
			});
		}
	}

	browser.tabs.query({currentWindow: true, active: true}).then(logTabs, onError);
}*/

/// Browser action
/// Neat URL code
function initBrowserAction(){
	var version = browser.runtime.getManifest().version;
	browser.browserAction.setTitle({title: "Neat URL " + version});
	
	browser.browserAction.onClicked.addListener((tab) => {
		if(enabled){
			browser.browserAction.setIcon({path: "icons/neaturl-96-state0_disabled.png"});
			browser.browserAction.setTitle({title: "Neat URL " + version + " - disabled"});
		}
		else{
			browser.browserAction.setIcon({path: "icons/neaturl-96-state0.png"});
			browser.browserAction.setTitle({title: "Neat URL " + version + " - enabled"});
		}
		
		enabled = !enabled;
	});
}

/// Context menus
/// Translate Now / Neat URL code
function initContextMenus(){
	createContextMenu("neaturl-tb-preferences", "Preferences", ["browser_action"]);
	browser.contextMenus.onClicked.addListener(listener);
}

/// Translate Now code
function createContextMenu(id, title, contexts){
	browser.contextMenus.create({
		id: id,
		title: title,
		contexts: contexts
	}, onCreated);

	function onCreated(n) {
		if (browser.runtime.lastError) {
			//console.log(`Error: ${browser.runtime.lastError}`);
		}
	}
}

/// Get Archive code
function openPreferences(){
	function onOpened() {
		//console.log(`Options page opened`);
	}

	browser.runtime.openOptionsPage().then(onOpened, onError);	
}

/// Translate Now / Lean URL code
function listener(info,tab){
	if(info.menuItemId == "neaturl-tb-preferences"){
		// Open Preferences
		openPreferences();
		return;
	}
}

/// Lean URL code
function getParams(URL) {
    var splitURL = URL.split("?");
    if ( splitURL.length == 1 ) {
        return null;
    }

    var params = {};
    rawParams = URL.split("?")[1].split("&");

    for ( var i = 0; i < rawParams.length; i++ ) {
        var rawParam = rawParams[i].split('=');
        params[rawParam[0]] = rawParam[1];
    }

    return params;
}

/// Lean URL code
function buildURL(baseURL, params) {
    if ( Object.keys(params).length == 0 ) {
        return baseURL;
    }

    var newURL = baseURL + "?";

    for ( var key in params ) {
        newURL += key + "=" + params[key] + "&";
    }
    newURL = newURL.slice(0, newURL.length-1);

    return newURL;
}

/// Neat URL code
function getDomain(url) {
	var arr = url.split("/")[2].split(".");
	
	if ( arr.length > 1 ) {
		return arr[arr.length - 2] + "." + arr[arr.length - 1];
	}
	
	return null;
}

/// Lean URL / Neat URL code
function cleanURL(details) {
	if(!enabled) return;
	
    var baseURL = details.url.split("?")[0];

    var params = getParams(details.url);
    if ( params == null ) {
        return;
    }

	var domain = getDomain(details.url);
	if ( domain == null ) {
		return;
	}
	
	var blockedParams = [];
	for (let gbp of neat_url_blocked_params) {
		if (gbp.indexOf("@") == -1) {
			blockedParams.push(gbp);
			continue;
		}
		
		var keyValue = gbp.split("@")[0];
		var keyDomain = gbp.split("@")[1];
			
		if( domain == keyDomain ) {
			blockedParams.push(keyValue);
		}
	}
	
	var reducedParams = {};
	for ( var key in params ) {
		if ( !blockedParams.includes(key) ) {
			reducedParams[key] = params[key];
		}
	}
	
    if ( Object.keys(reducedParams).length == Object.keys(params).length ) {
        return;
    }

	// Animate the toolbar icon
	animateToolbarIcon();

    leanURL = buildURL(baseURL, reducedParams);
    return { redirectUrl: leanURL };
}

/// Lean URL / Neat URL code
browser.webRequest.onBeforeRequest.addListener(
    cleanURL,
    {urls: ["<all_urls>"]},
    ["blocking"]
);

/// Neat URL code
function animateToolbarIcon(){
	if(neat_url_icon_animation == "none") return;
	
	var defaultState = "icons/neaturl-96-state0.png";
	var images = [];
	var imagesMissingUnderscore = ["icons/neaturl-96-state-1.png", defaultState, "icons/neaturl-96-state-1.png"];
	var imagesRotate = ["icons/neaturl-96-state1.png", "icons/neaturl-96-state2.png", "icons/neaturl-96-state3.png"];

	if(neat_url_icon_animation == "missing_underscore")
		images = imagesMissingUnderscore
	if(neat_url_icon_animation == "rotate")
		images = imagesRotate
		
	if(images.length == 0 && neat_url_icon_animation == "surprise_me"){
		// https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
		var zeroOrOne = Math.floor(Math.random() * 2);
		
		if(zeroOrOne == 0)
			images = imagesMissingUnderscore
		if(zeroOrOne == 1)
			images = imagesRotate
	}
	
	var time = 350 * images.length;
	
	// Set first state
	browser.browserAction.setIcon({path: images[0]});
		
	if(images.length > 1){
		setTimeout(function(){
			browser.browserAction.setIcon({path: images[1]});
		}, 1 * time);
	}

	if(images.length > 2){
		setTimeout(function(){
			browser.browserAction.setIcon({path: images[2]});
		}, 2 * time);
	}
	
	// Reset to default state
	setTimeout(function(){
		browser.browserAction.setIcon({path: defaultState});
	}, 3 * time);
}

/// Translate Now code
function notify(message){
	browser.notifications.create(message.substring(0, 20).replace(" ", ""),
	{
		type: "basic",
		iconUrl: browser.extension.getURL("icons/neaturl-96-state0.png"),
		title: "Neat URL",
		message: message
	});
}
