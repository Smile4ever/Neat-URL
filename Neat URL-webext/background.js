// Sources:
// * First version from Pure URL
// * https://cheeky4n6monkey.blogspot.nl/2014/10/google-eid.html
// * https://greasyfork.org/en/scripts/10096-general-url-cleaner
// * https://webapps.stackexchange.com/questions/9863/are-the-parameters-for-www-youtube-com-watch-documented
// * https://github.com/Smile4ever/firefoxaddons/issues/25
// * https://github.com/Smile4ever/firefoxaddons/issues/43

/// Static variables
let defaultGlobalBlockedParams = "utm_source, utm_medium, utm_term, utm_content, utm_campaign, utm_reader, utm_place, utm_userid, utm_cid, utm_name, utm_pubreferrer, utm_swu, utm_viz_id, ga_source, ga_medium, ga_term, ga_content, ga_campaign, ga_place, yclid, _openstat, fb_action_ids, fb_action_types, fb_ref, fb_source, action_object_map, action_type_map, action_ref_map, gs_l, pd_rd_r@amazon.*, pd_rd_w@amazon.*, pd_rd_wg@amazon.*, _encoding@amazon.*, psc@amazon.*, ved@google.*, ei@google.*, sei@google.*, gws_rd@google.*, cvid@bing.com, form@bing.com, sk@bing.com, sp@bing.com, sc@bing.com, qs@bing.com, pq@bing.com, feature@youtube.com, gclid@youtube.com, kw@youtube.com, $/ref@amazon.*, _hsenc, mkt_tok, hmb_campaign, hmb_medium, hmb_source";
let defaultRequestTypes = "main_frame";
let defaultBlacklist = ""; // google-analytics.com, sb.scorecardresearch.com, doubleclick.net, beacon.krxd.net"

/// Runtime setting
let enabled = true;

/// Used by addons.mozilla.org handling
let globalNeatURL = "";
let globalCurrentURL = "";
let globalTabId = -1;

/// Badge and browserAction (the variable version is also used for upgrades)
let badge=[]; // Hold the badge counts
const version = browser.runtime.getManifest().version;

/// Preferences
let neat_url_blacklist; // this is an array
let neat_url_icon_animation; // none, missing_underscore, rotate or surprise_me
let neat_url_icon_theme;
let neat_url_show_counter;
let neat_url_counter_color;
let neat_url_logging;
let neat_url_types;

// Used for upgrading purposes:
let neat_url_hidden_params; // this is an array
let neat_url_version; // previous version when upgrading, after upgrading the current version

function init(){
	var valueOrDefault = function(value, defaultValue){
		if(value == undefined)
			return defaultValue;
		return value;
	}
	
	var valueOrDefaultArray = function(value, defaultValue){
		var calcValue = valueOrDefault(value, defaultValue);
		if(calcValue == "") return [];
		return calcValue.split(" ").join("").split(",");
	}
	
	browser.storage.local.get([
		"neat_url_blocked_params",
		"neat_url_icon_animation",
		"neat_url_icon_theme",
		"neat_url_show_counter",
		"neat_url_counter_color",
		"neat_url_logging",
		"neat_url_blacklist",
		"neat_url_types"
	]).then((result) => {
		neat_url_blocked_params = valueOrDefaultArray(result.neat_url_blocked_params, defaultGlobalBlockedParams);
		neat_url_icon_animation = valueOrDefault(result.neat_url_icon_animation, "missing_underscore");
		neat_url_icon_theme = valueOrDefault(result.neat_url_icon_theme, "dark");
		neat_url_show_counter = valueOrDefault(result.neat_url_show_counter, true);
		neat_url_counter_color = valueOrDefault(result.neat_url_counter_color, "#000000");
		neat_url_logging = valueOrDefault(result.neat_url_logging, false);
		neat_url_blacklist = valueOrDefaultArray(result.neat_url_blacklist, defaultBlacklist);
		neat_url_types = valueOrDefaultArray(result.neat_url_types, defaultRequestTypes);

		browser.browserAction.setBadgeBackgroundColor({color: neat_url_counter_color});

		if(neat_url_types.length != 0){
			/// Register for types specified in neat_url_types
			browser.webRequest.onBeforeRequest.addListener(
				cleanURL,
				{urls: ["<all_urls>"], types: neat_url_types},
				["blocking"]
			);
		}

		initBrowserAction(); // Needs neat_url_icon_theme
	}).catch(console.error);
	
	browser.storage.local.get([
		"neat_url_hidden_params",
		"neat_url_version"
	]).then((result) => {
		neat_url_hidden_params = valueOrDefaultArray(result.neat_url_hidden_params, "");
		neat_url_version = valueOrDefault(result.neat_url_version, "0.1.0");

		upgradeParametersIfNeeded();
	}).catch(console.error);
	
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

/// Browser action
/// Neat URL code
function initBrowserAction(){
	browser.browserAction.setIcon({path: resolveIconURL("neaturl-96-state0.png")});
	browser.browserAction.setTitle({title: "Neat URL " + version + " - enabled"});

	browser.browserAction.onClicked.addListener((tab) => {
		enabled = !enabled;

		if(enabled){
			browser.browserAction.setIcon({path: resolveIconURL("neaturl-96-state0.png")});
			browser.browserAction.setTitle({title: "Neat URL " + version + " - enabled"});
		}
		else{
			browser.browserAction.setIcon({path: resolveIconURL("neaturl-96-state0_disabled.png")});
			browser.browserAction.setTitle({title: "Neat URL " + version + " - disabled"});
		}
	});
}

/// Context menus
/// Translate Now / Neat URL code
function initContextMenus(){
	try{
		browser.contextMenus.onClicked.removeListener(listener);
		browser.contextMenus.removeAll();
	}catch(ex){
		//console.log("contextMenu remove failed: " + ex);
	}
	
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

	browser.runtime.openOptionsPage().then(onOpened, null);
}

/// Translate Now / Lean URL code
function listener(info,tab){
	if(info.menuItemId == "neaturl-tb-preferences"){
		openPreferences();
		return;
	}
}

/// Neat URL code
function upgradeParametersIfNeeded(){	
	let oldVersion = neat_url_version;
	let newVersion = browser.runtime.getManifest().version;
	
	//console.log("upgradeParametersIfNeeded - " oldVersion + " => " + newVersion);
	
	if(oldVersion != newVersion){
		// Upgrade for neat_url_blocked_params is needed
		
		let changes = false;
		let defaultParams = defaultGlobalBlockedParams.split(", ");
		
		for(let defaultParam of defaultParams){
			if(neat_url_blocked_params.indexOf(defaultParam) == -1){
				if(neat_url_hidden_params.indexOf(defaultParam) == -1){
					//console.log("Adding parameter " + defaultParam + " during upgrade.");
					neat_url_blocked_params.push(defaultParam);
					changes = true;
				}
			}
		}
		
		if(oldVersion == "1.0.1" || oldVersion == "1.1.0" || oldVersion == "1.2.0"){
			// add gs_l parameter
			if(neat_url_blocked_params.indexOf("gs_l") == -1){
				neat_url_blocked_params.push("gs_l");
				changes = true;
			}
		}
		
		if(changes){
			browser.storage.local.set({"neat_url_blocked_params": neat_url_blocked_params.join(', ')})
		}
		
		// Upgrade value in browser.storage.local if oldVersion != newVersion
		browser.storage.local.set({"neat_url_version": newVersion});
	}
}

/// Neat URL code
function removeEndings(leanURL, domain, rootDomain, domainMinusSuffix, blockedParams){
    let isSearch = leanURL.search == "" ? false : true ;
    let path = leanURL.path;

	for(let gbp of blockedParams){//Again!? This is third loop!
		//let firstChar = gbp.substring(0, 1);
		//if(!isAlpha(firstChar) && firstChar != "_"){//why this now? For $ and $$? Why not check for $ then?
        if(gbp.startsWith('$')){
			//let match = getMatch(gbp, domain, rootDomain, domainMinusSuffix, leanURL);//this has already been doone
			//if(match == "" || match == null) continue;

			path = applyMatch(gbp, isSearch, path);
		}
	}
    leanURL.path = path;
	return leanURL;
}

// https://stackoverflow.com/questions/2450641/validating-alphabetic-only-string-in-javascript
/*function isAlpha(str) {//used only once... not even once
	return /^[a-zA-Z]$/.test(str);//no need for `+` for one char only
}*/

function applyMatch(match2, isSearch, leanURL){
	//let firstChar = match2.substr(0, 1);
	let secondChar = match2.substr(1, 1);
	let startIndexAsEnd = -1;

	//if(firstChar == "$"){//done earlier
		if(!isSearch || secondChar == "$" /*|| leanURL.indexOf("/dp/") > -1*/){//what is `/dp/` for???
			// Check it twice
			if(match2.indexOf("$") == 0) match2 = match2.substring(1);
			if(match2.indexOf("$") == 0) match2 = match2.substring(1);

			// if startIndexAsEnd is -1, we return the original URL without altering it
			startIndexAsEnd = leanURL.lastIndexOf(match2);
			//console.log("startIndexAsEnd is " + startIndexAsEnd + " inside of " + leanURL + " for " + match2);

			if(startIndexAsEnd > -1)
				leanURL = leanURL.substring(0, startIndexAsEnd);
		}
	//}

	/*this has already been doone
	if(firstChar == "#"){
		leanURL = leanURL.replace(match2, "");
	}*/

	return leanURL;
}

function getMatch(gbp, domain, rootDomain, domainMinusSuffix, detailsUrl){
	if (gbp.indexOf("@") == -1) {
		return gbp;
	}

	let keyValue, keyDomain, index;
    index = gbp.indexOf('@');
    [keyValue, keyDomain] = [gbp.slice(0,index), gbp.slice(index+1)];

	if(keyDomain.startsWith("*.")){
		// we have a wildcard domain, so compare with root domain please.
		keyDomain = keyDomain.replace("*.", "");
		if ( rootDomain == keyDomain ) {
			//console.log("matching to root domain");
			return keyValue;
		}
	}

	if(keyDomain.endsWith(".*")){
		//console.log("keyDomain " + keyDomain + " ends with .* - domainMinusSuffix is " + domainMinusSuffix);
		keyDomain = keyDomain.replace(".*", "");
		if ( domainMinusSuffix == keyDomain ) {
			//console.log("matching to wildcard domain");
			return keyValue;
		}
	}

	if( domain == keyDomain ) {
		//console.log("matching to domain " + domain + " for " + detailsUrl);
		return keyValue;
	}

	//console.log("not matching to domain " + domain + " with keyDomain " + keyDomain);
	return "";
}

/// Lean URL code
/*function getParams(URL) { //not used
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
}*/

/// Lean URL code
function buildURL(url, blockedParams, hashParams) {
    if (blockedParams.length == 0 && hashParams.length == 0) {
        return url;
    }

	//let urlObject = new URL(url);
	//let originalSearchParams = urlObject.searchParams;

	/// Process wildcards first for cleaner code
    //I see no mention about parameter wildcards???. 3.0.0 :/
	//let wildcardBlockedParams = []; //not used

	for(let blockedParam of blockedParams){
        if(blockedParam.startsWith('$')) continue;//another feature -> removeEndings()
        
		let wildcardIndex = blockedParam.indexOf("*");
		if(wildcardIndex == -1) continue;

		//let isLastChar = wildcardIndex == blockedParam.length - 1;
		if(wildcardIndex != blockedParam.length - 1) continue;

		let prefixParam = blockedParam.substring(0, wildcardIndex);
		for(let key of url.searchParams.keys()){
			if(key.startsWith(prefixParam)){
				// Match! We should remove this parameter.
                //Here be dragons ;)
				//console.log("buildURL - found wildcard parameter " + pair[0]);
				url.searchParams.delete(key);
			}
		}
	}

	/*for(let wildcardBlockedParam of wildcardBlockedParams){
		blockedParams.push(wildcardBlockedParam);
	}*/

	/// Remove blocked url params
	/*for(let blockedParam of blockedParams){
		if(blockedParam.indexOf("*") > -1) continue; // Wildcard parameters should have been processed by now
		originalSearchParams.delete(blockedParam);
	}*/

	//let newURL = urlObject.href;

	/// Replace hash params
	
	for(let hashParam of hashParams){
        //this will remove only one, exact, hashParam
        if(hashParam == url.hash){
            url.hash = "";
            break;
        }
	}

	/// URL() woes - + is not always %20
	//this should not matter
	/*if(decodeURIComponent(url).indexOf("+") == -1){
		newURL = newURL.replace("+", "%20");
	}*/

	/// URL() woes - Don't encode too much, thank you
	//???
	//newURL = urlDecode(newURL);

	/// URL() woes - do not add = when it's not needed
	/*if(newURL.split("#")[0].replaceAll("=", "") == url.split("#")[0].replaceAll("=", "")){
		return url;
	}*/

	/// URL() woes - Don't encode too much, thank you
	/*if(newURL.indexOf("??") == -1 && url.indexOf("??") > -1){
		return url;
	}*/

    return url;
}

/// Neat URL code
// Copied from https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
/*function getDomain(url) { //not used
	if(url == undefined || url == null) return null;
	
    var hostname = url.replace("www.", ""); // leave www out of this discussion. I don't consider this a subdomain
    //find & remove protocol (http, ftp, etc.) and get hostname
    
    if (url.indexOf("://") > -1) {
        hostname = hostname.split('/')[2];
    }
    else {
        hostname = hostname.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
}*/

function getDomainMinusSuffix(domain){
	//let domain = getDomain(url);
	let lastIndex = domain.lastIndexOf(".");
	let previousLastIndex = domain.lastIndexOf(".", lastIndex - 1);
  
	if(lastIndex - previousLastIndex < 4){
		lastIndex = previousLastIndex;
	}
	
	return domain.substring(0, lastIndex);
}

/// Neat URL code
// Copied from https://stackoverflow.com/questions/8498592/extract-hostname-name-from-string
function getRootDomain(domain) {
	if(domain == undefined || domain == null) return null;

    let /*domain = getDomain(url),*/
        splitArr = domain.split('.'),
        arrLen = splitArr.length;

    // Extract the root domain
    //http://publicsuffix.org/list/
    if (arrLen > 2) {
        if(splitArr[arrLen - 2].length <= 3){
            // oops.. this is becoming an invalid URL
            // Example URLs that trigger this code path are https://images.google.co.uk and https://google.co.uk
            domain = splitArr[arrLen - 3] + '.' + splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
        }else{
            domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
        }
    }
    
    return domain;
}

/*function urlDecode(url){ //not used
	return url
		.replaceAll("%3d", "=").replaceAll("%3D", "=")
		.replaceAll("%2c", ",").replaceAll("%2C", ",")
		.replaceAll("%3A", ":").replaceAll("%3A", ":")
		.replaceAll("%2f", "/").replaceAll("%2F", "/");
}*/

/// Lean URL / Neat URL code
function cleanURL(details) {
	if(!enabled) return;

	let originalDetailsUrl = details.url;
	let url = new URL(details.url);
    let domain = url.hostname
	// Do not change links for these domains
	for(let blackDomain of neat_url_blacklist){
		//console.log("blackDomain " + blackDomain);
		if(domain.endsWith(blackDomain)){
			if(neat_url_logging){
				console.log("not rewriting " + url.href);
			}
			return;
		}
	}

    //let baseURL = url.split("?")[0];
    //let params = url.search;
    //let hashParams = url.hash;
    
	if ("" === url.search && "" === url.hash){
		//console.log("no params for " + url);
		return;
	}

	//var domain = getDomain(url);
	domain = domain.replace(/^www\./i, '');//getDomain() -> //leave www out of this discussion. I don't consider this a subdomain
	var rootDomain = getRootDomain(domain);
	var domainMinusSuffix = getDomainMinusSuffix(domain);

	if (domain == null || rootDomain == null || domainMinusSuffix == null ){
		return;
	}	

	let blockedParams = [];
	let hashParams = [];

	for (let gbp of neat_url_blocked_params) {
		let match = getMatch(gbp, domain, rootDomain, domainMinusSuffix, url);
		if(match == "" || match == null) continue;

		if(match.indexOf("#") > -1){
			hashParams.push(match);
			continue;
		}

		blockedParams.push(match);
	}

	//let reducedParams = {};// == url.searchParams
	//! ?a=1&a=2 is valid
	for (let key in url.searchParams.keys()) {
		if (blockedParams.includes(key)) {
            url.searchParams.delete(key);
		}
	}

	// https://github.com/Smile4ever/firefoxaddons/issues/30 should no longer occur with the new buildURL function
	// https://github.com/Smile4ever/firefoxaddons/issues/47 should be solved as well
    leanURL = buildURL(url, blockedParams, hashParams);
    leanURL = removeEndings(leanURL, domain, rootDomain, domainMinusSuffix, blockedParams);

	// Is the URL changed?
	/*let decodedDetailsURL = urlDecode(decodeURIComponent(url));
	let decodedOriginalDetailsURL = urlDecode(decodeURIComponent(originalDetailsUrl));
	let decodedLeanURL = urlDecode(decodeURIComponent(leanURL));

	if(decodedLeanURL == decodedDetailsURL || decodedLeanURL == decodedOriginalDetailsURL){
		return;
	}*/
    if(originalDetailsUrl == leanURL.href) return;

	// Don't change the URL if any of these is true
	/*if(decodedLeanURL.indexOf("utm.gif") > -1 || decodedDetailsURL.indexOf("&&") > -1){//will see
		return;
	}*/

	if(neat_url_logging){
		console.log("Neat URL (type " + details.type + "): " + originalDetailsUrl + " has been changed to " + leanURL);
	}

	//let leanURLDomain = leanURL.hostname;

	const applyAfter = 1000;
    // Animate the toolbar icon
    if(leanURL.hostname != "addons.mozilla.org"){
		animateToolbarIcon();
		incrementBadgeValue(details.tabId);
	} else {

    // webRequest blocking is not supported on mozilla.org, lets fix this
    // but only if we are navigating to addons.mozilla.org and there doesn't exist a tab yet with the same URL

	//if(leanURLDomain == "addons.mozilla.org"){
		if(details.type != "main_frame") return;
		if(globalNeatURL == leanURL.href) return;

		globalNeatURL = leanURL.href;
		globalCurrentURL = originalDetailsUrl;
		globalTabId = details.tabId;

		setTimeout(function(){
			browser.tabs.query({url: globalCurrentURL}).then(function logTabs(tabs) {
				if(globalNeatURL == null || globalNeatURL == "") return;

				if(tabs.length == 0){
					//console.log("the query for " + globalCurrentURL + " returned nothing. Attempting " + globalNeatURL);
				}else{
					//console.log("It was opened in a new tab, update that tab to " + globalNeatURL);

					for (tab of tabs) {
						console.log("really updating " + tab.url + " to " + globalNeatURL);
						browser.tabs.update(tab.id, {url: globalNeatURL});//May be fired more than once?
						animateToolbarIcon();
						incrementBadgeValue(globalTabId);
					}
				}

				setTimeout(function(){
					globalNeatURL = "";
					globalCurrentURL = "";
				}, applyAfter);
			}, null);
		}, applyAfter);
	}

    return { redirectUrl: leanURL.href };
}

/// Neat URL code
function animateToolbarIcon(){
	if(neat_url_icon_animation == "none") return;
	
	var defaultState = resolveIconURL("neaturl-96-state0.png");
	var images = [];
	var imagesMissingUnderscore = [resolveIconURL("neaturl-96-state-1.png"), defaultState, resolveIconURL("neaturl-96-state-1.png")];
	var imagesRotate = [resolveIconURL("neaturl-96-state1.png"), resolveIconURL("neaturl-96-state2.png"), resolveIconURL("neaturl-96-state3.png")];

	if(neat_url_icon_animation == "missing_underscore")
		images = imagesMissingUnderscore;
	if(neat_url_icon_animation == "rotate")
		images = imagesRotate;
		
	if(images.length == 0 && neat_url_icon_animation == "surprise_me"){
		// https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
		var zeroOrOne = Math.floor(Math.random() * 2);
		
		if(zeroOrOne == 0)
			images = imagesMissingUnderscore;
		if(zeroOrOne == 1)
			images = imagesRotate;
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
		iconUrl: browser.extension.getURL(resolveIconUrlNotif("neaturl-96-state0.png")),
		title: "Neat URL",
		message: message
	});
}

function resolveIconByTheme(file, theme){
	return "icons/" + theme + "/" + file;
}

function resolveIconURL(file){
	let theme = neat_url_icon_theme.replace("_notiflight", "").replace("_notifdark", "");
	return resolveIconByTheme(file, theme);
}

function resolveIconUrlNotif(file){
	if(neat_url_icon_theme.indexOf("_notiflight") > -1){
		return resolveIconByTheme(file, "light");
	}
	if(neat_url_icon_theme.indexOf("_notifdark") > -1){
		return resolveIconByTheme(file, "dark");
	}
	return resolveIconByTheme(file, neat_url_icon_theme);
}

String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};

function updateBadgeText(tabId){
	// We're only updating the view
	// The data won't be touched

	//console.log("updateBadgeText - I'm updating the badge text for tabId " + tabId);
	let badgeCounts = badge[tabId];
	if(badgeCounts == null){
		//console.log("badgeCounts == null");
		badgeCounts = ""; // Set empty instead of null or 0
	}else{
		//console.log("badgeCounts is not null");
	}

	/// Update browserAction with badge count for the current tab. If the current tab changes, we will update it again
	//console.log("updateBadgeText - badgeCounts is " + badgeCounts);
	browser.browserAction.setBadgeText({text: badgeCounts+""});
}

function incrementBadgeValue(tabId){
	// We're only updating the data
	// The view will be updated when needed by the listeners

	if(tabId == -1)
	{
		// The request is unrelated to a tab
		return;
	}

	//console.log("getting badgeCounts for tabId " + tabId + " is " + badge[tabId]);
	let badgeCounts = badge[tabId];
	if(badgeCounts == null){
		//console.log("badgeCounts == null");
		badgeCounts = 0;
	}else{
		//console.log("badgeCounts is not null, but " + badgeCounts);
	}
	badgeCounts++;
	badge[tabId] = badgeCounts;

	//console.log("setting badgeCount to " + badgeCounts + " - result is " + badge[tabId]);
}

browser.tabs.onCreated.addListener(function(tab){
	// Tabs can be created in the background. We're not interested in that.
	if(tab.active){
		//console.log("Updating currentTabId to " + tab.id + " by onCreated");
		updateBadgeText(tab.id);
	}
});

browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tabInfo){
	// Tabs can be updated in the background. We're not interested in that.
	if(tabInfo.active){
		//console.log("Updating currentTabId to " + tabInfo.id + " by onUpdated");
		updateBadgeText(tabInfo.id);
	}
});

browser.tabs.onActivated.addListener(function(activeInfo){
	// Tabs can be inactive when updating or creating and afterwards activated. We could check tab.active but it will always be true
	//console.log("Updating currentTabId to " + activeInfo.tabId + " by onActivated");
	updateBadgeText(activeInfo.tabId);
});

// Reset inside "dictionary"
browser.tabs.onRemoved.addListener(function(tab){
	// We're not changing the currentTabId here, since onRemoved will call onActivated implicitly
	// We're only resetting the count for the badge, so that if another tab gets the same id, we don't be using the badge count of that unrelated tab
	badge[tab.id] = null;
});
