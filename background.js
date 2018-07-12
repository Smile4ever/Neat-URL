<<<<<<< HEAD
// Sources:
// * First version from Pure URL
// * https://cheeky4n6monkey.blogspot.nl/2014/10/google-eid.html
// * https://greasyfork.org/en/scripts/10096-general-url-cleaner
// * https://webapps.stackexchange.com/questions/9863/are-the-parameters-for-www-youtube-com-watch-documented
// * https://github.com/Smile4ever/firefoxaddons/issues/25
// * https://github.com/Smile4ever/firefoxaddons/issues/43

/// Static variables
let defaultGlobalBlockedParams = "utm_source, utm_medium, utm_term, utm_content, utm_campaign, utm_reader, utm_place, utm_userid, utm_cid, utm_name, utm_pubreferrer, utm_swu, utm_viz_id, ga_source, ga_medium, ga_term, ga_content, ga_campaign, ga_place, yclid, _openstat, fb_action_ids, fb_action_types, fb_ref, fb_source, action_object_map, action_type_map, action_ref_map, gs_l, pd_rd_*@amazon.*, _encoding@amazon.*, psc@amazon.*, ved@google.*, ei@google.*, sei@google.*, gws_rd@google.*, cvid@bing.com, form@bing.com, sk@bing.com, sp@bing.com, sc@bing.com, qs@bing.com, pq@bing.com, feature@youtube.com, gclid@youtube.com, kw@youtube.com, $/ref@amazon.*, _hsenc, mkt_tok, hmb_campaign, hmb_medium, hmb_source, source@sourceforge.net, position@sourceforge.net, callback@bilibili.com, elqTrackId, elqTrack, assetType, assetId, recipientId, campaignId, siteId, tag@amazon.*, ref_@amazon.*, pf_rd_*@amazon.*, spm@*.aliexpress.com, scm@*.aliexpress.com, aff_platform, aff_trace_key, terminal_id, _hsmi";
let defaultRequestTypes = "main_frame";
let defaultBlacklist = ""; // google-analytics.com, sb.scorecardresearch.com, doubleclick.net, beacon.krxd.net"
let suffixList = new Array();

/// Runtime setting
let enabled = true;

/// Used by addons.mozilla.org handling
let globalNeatURL = "";
let globalCurrentURL = "";
let globalTabId = -1;

/// Badge and browserAction (the variable version is also used for upgrades)
let badge=[]; // Hold the badge counts
let version = browser.runtime.getManifest().version;

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
	let valueOrDefault = function(value, defaultValue){
=======
/// Static variables
var defaultGlobalBlockedParams = "utm_source, utm_medium, utm_term, utm_content, utm_campaign, utm_reader, utm_place, ga_source, ga_medium, ga_term, ga_content, ga_campaign, ga_place, yclid, _openstat, fb_action_ids, fb_action_types, fb_ref, fb_source, action_object_map, action_type_map, action_ref_map"; // From Pure URL
var enabled = true;

/// Preferences
var neat_url_blocked_params; // this is an array!
var neat_url_icon_animation; // none, missing_underscore, rotate or surprise_me

function init(){
	var valueOrDefault = function(value, defaultValue){
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
		if(value == undefined)
			return defaultValue;
		return value;
	}
	
<<<<<<< HEAD
	let valueOrDefaultArray = function(value, defaultValue){
		let calcValue = valueOrDefault(value, defaultValue);
		if(calcValue == "") return [];
=======
	var valueOrDefaultArray = function(value, defaultValue){
		var calcValue = valueOrDefault(value, defaultValue);
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
		return calcValue.split(" ").join("").split(",");
	}
	
	browser.storage.local.get([
		"neat_url_blocked_params",
<<<<<<< HEAD
		"neat_url_icon_animation",
		"neat_url_icon_theme",
		"neat_url_show_counter",
		"neat_url_counter_color",
		"neat_url_logging",
		"neat_url_blacklist",
		"neat_url_types",
		"neat_url_counter_default_color"
	]).then((result) => {
		neat_url_blocked_params = valueOrDefaultArray(result.neat_url_blocked_params, defaultGlobalBlockedParams);
		neat_url_icon_animation = valueOrDefault(result.neat_url_icon_animation, "missing_underscore");
		neat_url_icon_theme = valueOrDefault(result.neat_url_icon_theme, "dark");
		neat_url_show_counter = valueOrDefault(result.neat_url_show_counter, true);
		neat_url_counter_color = valueOrDefault(result.neat_url_counter_color, "#000000");
		neat_url_logging = valueOrDefault(result.neat_url_logging, false);
		neat_url_blacklist = valueOrDefaultArray(result.neat_url_blacklist, defaultBlacklist);
		neat_url_types = valueOrDefaultArray(result.neat_url_types, defaultRequestTypes);
		neat_url_counter_default_color = valueOrDefault(result.neat_url_counter_default_color, true); // true as default

		// Upgrade configuration from old releases
		if(neat_url_counter_default_color == null && neat_url_counter_color == "#eeeeee"){
			// Update counter_color to null
			browser.storage.local.set({ neat_url_counter_color: null });

			// Update counter_default_color to true
			browser.storage.local.set({ neat_url_counter_default_color: true }); // not strictly needed, but this shouldn't hurt either

			// Do not use any color
			neat_url_counter_default_color = true;
		}

		if(!neat_url_counter_default_color)
			browser.browserAction.setBadgeBackgroundColor({color: neat_url_counter_color});

		// Re-initialise listener, hopefully fixes https://github.com/Smile4ever/firefoxaddons/issues/92
		browser.webRequest.onBeforeRequest.removeListener(cleanURL);
		if(neat_url_types.length != 0){
			/// Register for types specified in neat_url_types
			browser.webRequest.onBeforeRequest.addListener(
				cleanURL,
				{urls: ["<all_urls>"], types: neat_url_types},
				["blocking"]
			);
		}

		initBrowserAction(); // needs neat_url_icon_theme
		initCounter(); // needs neat_url_show_counter
	}).catch(console.error);
	
	browser.storage.local.get([
		"neat_url_hidden_params",
		"neat_url_version"
	]).then((result) => {
		neat_url_hidden_params = valueOrDefaultArray(result.neat_url_hidden_params, "");
		neat_url_version = valueOrDefault(result.neat_url_version, "0.1.0");

		upgradeParametersIfNeeded();
	}).catch(console.error);
	
	fetch('publicsuffix-ccSLD.txt').then(function(response) {
		return response.text();		
	}).then(function(text){
		suffixList = text.split("\n");
	});
	
=======
		"neat_url_icon_animation"
	]).then((result) => {
		//console.log("background.js neat_url_blocked_params " + result.neat_url_blocked_params);
		neat_url_blocked_params = valueOrDefaultArray(result.neat_url_blocked_params, defaultGlobalBlockedParams);
		//console.log("background.js neat_url_icon_animation " + result.neat_url_icon_animation);
		neat_url_icon_animation = valueOrDefault(result.neat_url_icon_animation, "missing_underscore");
	}).catch(console.error);
	
	initBrowserAction();
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
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

<<<<<<< HEAD
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
=======
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
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
	});
}

/// Context menus
/// Translate Now / Neat URL code
function initContextMenus(){
<<<<<<< HEAD
	browser.contextMenus.onClicked.removeListener(listener);
	browser.contextMenus.removeAll().catch(null);
	
=======
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
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
<<<<<<< HEAD
		//console.log(`[Neat URL]: Error: ${browser.runtime.lastError}`);
=======
		if (browser.runtime.lastError) {
			//console.log(`Error: ${browser.runtime.lastError}`);
		}
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
	}
}

/// Get Archive code
function openPreferences(){
<<<<<<< HEAD
	browser.runtime.openOptionsPage();
=======
	function onOpened() {
		//console.log(`Options page opened`);
	}

	browser.runtime.openOptionsPage().then(onOpened, onError);	
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
}

/// Translate Now / Lean URL code
function listener(info,tab){
	if(info.menuItemId == "neaturl-tb-preferences"){
<<<<<<< HEAD
=======
		// Open Preferences
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
		openPreferences();
		return;
	}
}

<<<<<<< HEAD
/// Neat URL code
function upgradeParametersIfNeeded(){
	let oldVersion = neat_url_version;
	let newVersion = browser.runtime.getManifest().version;
	
	//console.log("[Neat URL]: upgradeParametersIfNeeded - " + oldVersion + " => " + newVersion);
	
	if(oldVersion != newVersion){
		let changes = false;
		let defaultParams = defaultGlobalBlockedParams.split(", ");
		
		for(let defaultParam of defaultParams){
			if(neat_url_blocked_params.indexOf(defaultParam) == -1){
				if(neat_url_hidden_params.indexOf(defaultParam) == -1){
					//console.log("[Neat URL]: Adding parameter " + defaultParam + " during upgrade.");
					if(defaultParam == "pd_rd_*@amazon.*"){
						neat_url_blocked_params = removeFromArray(neat_url_blocked_params, "pd_rd_r@amazon.*");
						neat_url_blocked_params = removeFromArray(neat_url_blocked_params, "pd_rd_w@amazon.*");
						neat_url_blocked_params = removeFromArray(neat_url_blocked_params, "pd_rd_wg@amazon.*");
					}
					
					neat_url_blocked_params.push(defaultParam);
					changes = true;
				}
			}
		}

		if(newVersion == "4.1.2"){
			neat_url_blocked_params = removeFromArray(neat_url_blocked_params, "ref");
			changes = true;
		}

		if(changes){
			browser.storage.local.set({"neat_url_blocked_params": neat_url_blocked_params.join(', ')})
		}
		
		// Upgrade value in browser.storage.local if oldVersion != newVersion
		browser.storage.local.set({"neat_url_version": newVersion});
	}
}

function removeFromArray(array, item){
	var index = array.indexOf(item);
	if (index > -1) {
		array.splice(index, 1);
	}
	return array;
}

/// Neat URL code
function removeEndings(leanURL, blockedParams){
	let isSearch = leanURL.search == "" ? false : true ;
	let path = leanURL.pathname;

	for(let gbp of blockedParams){
		if(gbp.startsWith('$')){
			path = applyMatch(gbp, isSearch, path);
		}
	}
	if(leanURL.pathname != path){
		leanURL.pathname = path;
		leanURL.search = "";//should be empty before or removed right now by $$
	}
	return leanURL;
}

function applyMatch(match2, isSearch, leanURL){
	let secondChar = match2.substr(1, 1);
	let startIndexAsEnd = -1;

	// /dp/ is for Amazon product pages
	if(!isSearch || secondChar == "$" || leanURL.indexOf("/dp/") > -1){
		// Check it twice
		if(match2.indexOf("$") == 0) match2 = match2.substring(1);
		if(match2.indexOf("$") == 0) match2 = match2.substring(1);

		startIndexAsEnd = leanURL.lastIndexOf(match2);
		//console.log("[Neat URL]: startIndexAsEnd is " + startIndexAsEnd + " inside of " + leanURL + " for " + match2);

		// if startIndexAsEnd is -1, we return the original URL without altering it
		if(startIndexAsEnd > -1)
			leanURL = leanURL.substring(0, startIndexAsEnd);
	}

	return leanURL;
}

function getMatch(gbp, domain, rootDomain, domainMinusSuffix, detailsUrl){
	if (gbp.indexOf("@") == -1) {
		return gbp;
	}

	// Workaround for https://github.com/Smile4ever/firefoxaddons/issues/76
	if (gbp == "gws_rd@google.*" && rootDomain == "google.com" && detailsUrl.contains("gws_rd=cr")){
		return;
	}

	let keyValue, keyDomain, index;
	index = gbp.indexOf('@');
	[keyValue, keyDomain] = [gbp.slice(0,index), gbp.slice(index+1)];

	if(keyDomain.startsWith("*.")){
		// we have a wildcard domain, so compare with root domain please.
		keyDomain = keyDomain.replace("*.", "");
		if ( rootDomain == keyDomain ) {
			//console.log("[Neat URL]: matching to root domain");
			return keyValue;
		}
	}

	if(keyDomain.endsWith(".*")){
		//console.log("[Neat URL]: keyDomain " + keyDomain + " ends with .* - domainMinusSuffix is " + domainMinusSuffix);
		keyDomain = keyDomain.replace(".*", "");

		if (domainMinusSuffix == keyDomain) {
			//console.log("[Neat URL]: matching to wildcard domain");
			return keyValue;
		}
	}

	if(domain == keyDomain) {
		//console.log("[Neat URL]: matching to domain " + domain + " for " + detailsUrl);
		return keyValue;
	}

	//console.log("[Neat URL]: not matching to domain " + domain + " with keyDomain " + keyDomain);
	return "";
}

/// Lean URL code
function buildURL(url, blockedParams, hashParams) {
	if (blockedParams.length == 0 && hashParams.length == 0) {
		return url;
	}

	/// Process wildcards parameters
	for(let blockedParam of blockedParams){
		if(blockedParam.startsWith('$')) continue;//another feature -> removeEndings()

		// Wildcard support :)
		// utm_*
		let wildcardParam = getWildcardParam(blockedParam);
		if(wildcardParam != "")	url = deleteWildcardParam(wildcardParam, url);
	}

	/// Replace hash params
	let hashUrl = new URL(url.href);
	hashUrl.search = hashUrl.hash.replace('#', '');
	hashUrl.hash = '';

	let searchParamsBefore = hashUrl.href;

	for(let hashParam of hashParams){
		//this will remove one, exact, hashParam
		if(hashParam == "#" + hashUrl.search){
			hashUrl.search = "";
			break;
		}

		/// Do something special!
		// https://github.com/Smile4ever/firefoxaddons/issues/83
		// #?utm_source
		// Example URL: http://www.cuisineactuelle.fr/recettes/mini-burgers-au-foie-gras-331523#utm_source=Facebook&utm_medium=social&utm_campaign=PassionApero
		if (hashParam.startsWith('#?')) {
			let specialHashParam = hashParam.replace('#?', '');
			if(neat_url_logging) console.log("[Neat URL]: buildURL - found hash parameter " + hashParam);

			// Wildcard support :)
			// utm_*
			let wildcardParam = getWildcardParam(specialHashParam);
			if(wildcardParam != "")	hashUrl = deleteWildcardParam(wildcardParam, hashUrl);

			// utm_source
			hashUrl.searchParams.delete(specialHashParam);
		}
	}

	// Stringify from URL object adds = to the other parameters without value, sadly.
	// In most cases this won't be a problem, if it is there will be bugs about it
	// Workaround to above encoding issue: only use the new value if the length is less now
	if(new URL(searchParamsBefore).length > new URL(hashUrl.href).length){
		const newHash = hashUrl.search.replace('?', '');
		url.hash = newHash ? `#${newHash}` : '';
	}

	return url;
}

function getWildcardParam(param){
	let wildcardIndex = param.indexOf("*");

	let wildcard = wildcardIndex > -1;
	let isLastChar = wildcardIndex == param.length - 1;

	if(!wildcard || !isLastChar) return "";
	return param.substring(0, wildcardIndex);
}

function deleteWildcardParam(wildcardParam, url){
	for(let key of url.searchParams.keys()){
		if(key.startsWith(wildcardParam)){
			// Match! We should remove this parameter.
			// Here be dragons ;)
			if(neat_url_logging) console.log("[Neat URL]: buildURL - found wildcard parameter " + key + " for " + wildcardParam);
			url.searchParams.delete(key);
		}
	}

	return url;
}

function getDomainMinusSuffix(domain){
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

	let splitArr = domain.split('.'),
		arrLen = splitArr.length;

	// grep -e '^[a-zA-Z]\{2,3\}\.[a-zA-Z]\{2,3\}$' publicsuffix.txt > publicsuffix-ccSLD.txt
	
	// Extract the root domain
	//http://publicsuffix.org/list/
	if (arrLen > 2) {
		// Checking for double domains with 3 or less characters using publicsuffix-ccSLD.txt. Fixes support *.jd.com for https://item.jd.com
		if(splitArr[arrLen - 2].length <= 3){
			var toCheck = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1]; // co.uk (found) or item.jd.com (not found)
			
			if(neat_url_logging) console.log("Probably not desired: " + toCheck);
			if(neat_url_logging) console.log("Probably more desired: " + splitArr[arrLen - 3] + '.' + splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1]);
			
			if(suffixList.indexOf(toCheck) > -1){
				// Example URLs that trigger this code path are https://images.google.co.uk and https://google.co.uk
				if(neat_url_logging) console.log(toCheck + " found in the list!");

				domain = splitArr[arrLen - 3] + '.' + splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
			}else{
				if(neat_url_logging) console.log(toCheck + " not found in the list!");
				domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
			}
		
		}else{
			domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
		}
	}

	return domain;
=======
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
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
}

/// Lean URL / Neat URL code
function cleanURL(details) {
	if(!enabled) return;
<<<<<<< HEAD

	let url = new URL(details.url);
	let domain = url.hostname;
	let originalDetailsUrl = details.url;

	// Do not change links for these domains
	for(let blackDomain of neat_url_blacklist){
		if(domain.endsWith(blackDomain)){
			if(neat_url_logging) console.log(`[Neat URL]: not rewriting '${url.href}'`);
			return;
		}
	}

	if ("" === url.search && "" === url.hash){
		let hasEndingParams = false;

		for (let gbp of neat_url_blocked_params) {
			let gbp_clean = gbp.replace("$$", "").replace("$", "").split("@")[0];
			if(url.href.indexOf(gbp_clean) > -1){
				if(neat_url_logging) console.log(`[Neat URL]: We have an ending parameter`);
				hasEndingParams = true;
			}
		}

		if(!hasEndingParams){
			if(neat_url_logging) console.log(`[Neat URL]: no params for '${url.href}'`);
			return;
		}
	}

	domain = domain.replace(/^www\./i, '');//getDomain() -> //leave www out of this discussion. I don't consider this a subdomain
	let rootDomain = getRootDomain(domain);
	let domainMinusSuffix = getDomainMinusSuffix(domain);

	if (domain == null || rootDomain == null || domainMinusSuffix == null ){
		return;
	}	

	let blockedParams = [];
	let hashParams = [];
	let excludeParams = [];

	for (let gbp of neat_url_blocked_params) {
		let match = getMatch(gbp, domain, rootDomain, domainMinusSuffix, url);
		if(match == "" || match == null) continue;

		if(match.startsWith("#")){
			if(neat_url_logging) console.log(`[Neat URL]: hash param '${match}' matches`);
			hashParams.push(match);
			continue;
		}
		
		// Excludes
		if(match.startsWith("!")){
			excludeParams.push(match);
			continue;
		}

		blockedParams.push(match);
	}
	
	for(let excludeParam of excludeParams){
		blockedParams = removeFromArray(blockedParams, excludeParam.replace("!", ""));
	}

	//! ?a=1&a=2 is valid
	// keys must be removed in reverse,
	// because, when first is removed, third is moved to second position
	let forparams = new URL(url);//or... make copy
	for (let key of forparams.searchParams.keys()) {
		//console.log(`[Neat URL]: if includes(${key})`)
		if (blockedParams.includes(key)) {
			//console.log(`[Neat URL]: delete(${key})`)
			url.searchParams.delete(key);
		}
	}

	// https://github.com/Smile4ever/firefoxaddons/issues/30 should no longer occur with the new buildURL function
	// https://github.com/Smile4ever/firefoxaddons/issues/47 should be solved as well
	leanURL = buildURL(url, blockedParams, hashParams);
	leanURL = removeEndings(leanURL, blockedParams);

	// Is the URL changed?
	if(new URL(originalDetailsUrl).href == leanURL.href) return;

	if(neat_url_logging){
		console.log(`[Neat URL]: (type ${details.type}): '${originalDetailsUrl}' has been changed to '${leanURL}'`);
	}

	const applyAfter = 1000;

	if(leanURL.hostname != "addons.mozilla.org"){
		animateToolbarIcon();
		if(neat_url_show_counter) incrementBadgeValue(details.tabId);
	} else {
		// webRequest blocking is not supported on mozilla.org, lets fix this
		// but only if we are navigating to addons.mozilla.org and there doesn't exist a tab yet with the same URL
		if(details.type != "main_frame") return;
		if(globalNeatURL == leanURL.href) return;

		globalNeatURL = leanURL.href;
		globalCurrentURL = originalDetailsUrl;
		globalTabId = details.tabId;

		setTimeout(function(){
			browser.tabs.query({url: globalCurrentURL}).then(function logTabs(tabs) {
				if(globalNeatURL == null || globalNeatURL == "") return;

				if(tabs.length == 0){
					//console.log(`[Neat URL]: the query for '${globalCurrentURL}' returned nothing. Attempting '${globalNeatURL}'`);
				}else{
					//console.log(`[Neat URL]: It was opened in a new tab, update that tab to '${globalNeatURL}'`);

					for (tab of tabs) {
						if(neat_url_logging){
							console.log(`[Neat URL]: really updating '${tab.url}' to '${globalNeatURL}'`);
						}
						browser.tabs.update(tab.id, {url: globalNeatURL});//May be fired more than once?
						animateToolbarIcon();
						if(neat_url_show_counter) incrementBadgeValue(globalTabId);
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
=======
	
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
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
}

/// Translate Now code
function notify(message){
<<<<<<< HEAD
	browser.notifications.create(message.substring(0, 20),
	{
		type: "basic",
		iconUrl: browser.extension.getURL(resolveIconUrlNotif("neaturl-96-state0.png")),
=======
	browser.notifications.create(message.substring(0, 20).replace(" ", ""),
	{
		type: "basic",
		iconUrl: browser.extension.getURL("icons/neaturl-96-state0.png"),
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
		title: "Neat URL",
		message: message
	});
}
<<<<<<< HEAD

String.prototype.replaceAll = function(search, replacement) {
	let target = this;
	return target.replace(new RegExp(search, 'g'), replacement);
};
=======
>>>>>>> 2729b1a... Neat URL-webext 1.0.0:
