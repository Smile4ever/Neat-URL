/// Neat URL code
function animateToolbarIcon(){
	if(neat_url_icon_animation == "none") return;

	let defaultState = resolveIconURL("neaturl-96-state0.png");
	let images = [];
	let imagesMissingUnderscore = [resolveIconURL("neaturl-96-state-1.png"), defaultState, resolveIconURL("neaturl-96-state-1.png")];
	let imagesRotate = [resolveIconURL("neaturl-96-state1.png"), resolveIconURL("neaturl-96-state2.png"), resolveIconURL("neaturl-96-state3.png")];

	if(neat_url_icon_animation == "missing_underscore")
		images = imagesMissingUnderscore;
	if(neat_url_icon_animation == "rotate")
		images = imagesRotate;

	if(images.length == 0 && neat_url_icon_animation == "surprise_me"){
		// https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript
		let zeroOrOne = Math.floor(Math.random() * 2);

		if(zeroOrOne == 0)
			images = imagesMissingUnderscore;
		if(zeroOrOne == 1)
			images = imagesRotate;
	}

	let time = 350 * images.length;

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

function updateBadgeText(tabId){
	// We're only updating the view
	// The data won't be touched

	//console.log("[Neat URL]: updateBadgeText - I'm updating the badge text for tabId " + tabId);
	let badgeCounts = badge[tabId];
	if(badgeCounts == null){
		//console.log("[Neat URL]: badgeCounts == null");
		badgeCounts = ""; // Set empty instead of null or 0
	}else{
		//console.log("[Neat URL]: badgeCounts is not null");
	}

	/// Update browserAction with badge count for the current tab. If the current tab changes, we will update it again
	//console.log("[Neat URL]: updateBadgeText - badgeCounts is " + badgeCounts);
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

	//console.log("[Neat URL]: getting badgeCounts for tabId " + tabId + " is " + badge[tabId]);
	let badgeCounts = badge[tabId];
	if(badgeCounts == null){
		//console.log("[Neat URL]: badgeCounts == null");
		badgeCounts = 0;
	}else{
		//console.log("[Neat URL]: badgeCounts is not null, but " + badgeCounts);
	}
	badgeCounts++;
	badge[tabId] = badgeCounts;

	//console.log("[Neat URL]: setting badgeCount to " + badgeCounts + " - result is " + badge[tabId]);
}

function initCounter(){
	browser.tabs.onCreated.removeListener(onTabCreated);
	browser.tabs.onUpdated.removeListener(onTabUpdated);
	browser.tabs.onActivated.removeListener(onTabActivated);
	browser.tabs.onRemoved.removeListener(onTabRemoved);

	if(neat_url_show_counter){
		browser.tabs.onCreated.addListener(onTabCreated);
		browser.tabs.onUpdated.addListener(onTabUpdated);
		browser.tabs.onActivated.addListener(onTabActivated);
		browser.tabs.onRemoved.addListener(onTabRemoved);
	}else{
		// Clear dictionary entirely
		badge = [];
	}

	// Current tab will be the options page or just an irrelevant tab - no need to update the view with updateBadgeText
}

function onTabCreated(tab){
	// Tabs can be created in the background. We're not interested in that.
	if(!tab.active) return;

	//console.log("[Neat URL]: Updating currentTabId to " + tab.id + " by onCreated");
	updateBadgeText(tab.id);
}

function onTabUpdated(tabId, changeInfo, tabInfo){
	// Tabs can be updated in the background. We're not interested in that.
	if(!tabInfo.active) return;

	//console.log("[Neat URL]: Updating currentTabId to " + tabInfo.id + " by onUpdated");
	updateBadgeText(tabInfo.id);
}

function onTabActivated(activeInfo){
	// Tabs can be inactive when updating or creating and afterwards activated. We could check tab.active but it will always be true
	//console.log("[Neat URL]: Updating currentTabId to " + activeInfo.tabId + " by onActivated");
	updateBadgeText(activeInfo.tabId);
}

function onTabRemoved(tab){
	// Reset inside "dictionary"
	// We're not changing the currentTabId here, since onRemoved will call onActivated implicitly
	// We're only resetting the count for the badge, so that if another tab gets the same id, we don't be using the badge count of that unrelated tab
	badge[tab.id] = null;
}
