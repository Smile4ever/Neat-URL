// Sources:
// * First version from Pure URL
// * https://cheeky4n6monkey.blogspot.nl/2014/10/google-eid.html
// * https://greasyfork.org/en/scripts/10096-general-url-cleaner
// * https://webapps.stackexchange.com/questions/9863/are-the-parameters-for-www-youtube-com-watch-documented
// * https://github.com/Smile4ever/firefoxaddons/issues/25
// * https://github.com/Smile4ever/firefoxaddons/issues/43

/// Runtime setting
let enabled = true;

/// Used by addons.mozilla.org handling
let globalNeatURL = "";
let globalCurrentURL = "";
let globalTabId = -1;

/// Badge and browserAction (the variable version is also used for upgrades)
let badge = []; // Hold the badge counts
let version = browser.runtime.getManifest().version;

/// Preferences from JSON
let neat_url_default_blocked_params; // Exception: this is not editable and doesn't come out of storage local!

/// Preferences
let neat_url_icon_animation; // none, missing_underscore, rotate or surprise_me
let neat_url_icon_theme;
let neat_url_counter_color;
let neat_url_counter_default_color;
let neat_url_blocked_params;

let neat_url_types; // Used to init the onBeforeRequest listener
let neat_url_version; // Used for upgrading purposes: previous version when upgrading, after upgrading the current version

function init(){	
	browser.storage.local.get([
		"neat_url_icon_animation",
		"neat_url_icon_theme",
		"neat_url_counter_color",
		"neat_url_counter_default_color",
		"neat_url_blocked_params",
		"neat_url_types",
		"neat_url_version"
	]).then((storageLocalResult) => {
		neat_url_icon_animation = valueOrDefault(storageLocalResult.neat_url_icon_animation, "missing_underscore");
		neat_url_icon_theme = valueOrDefault(storageLocalResult.neat_url_icon_theme, "dark");
		neat_url_counter_color = valueOrDefault(storageLocalResult.neat_url_counter_color, "#000000");
		neat_url_counter_default_color = valueOrDefault(storageLocalResult.neat_url_counter_default_color, true); // true as default

		neat_url_blocked_params = valueOrDefaultArray(storageLocalResult.neat_url_blocked_params, []);
		neat_url_types = valueOrDefaultArray(storageLocalResult.neat_url_types, defaultRequestResourceTypes);
		neat_url_version = valueOrDefault(storageLocalResult.neat_url_version, "0.1.0");
		
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
		deleteDefaultParametersFromBlockedParameters(); // needs neat_url_icon_theme / neat_url_blocked_params / neat_url_override_default_blocked_params

		return storageLocalResult;
	})
	// Retrieve default parameters from JSON file and set neat_url_blocked_params
	.catch(console.error);
	
	initContextMenus();
}
init();

///Messages
// listen for messages from the content or options script
browser.runtime.onMessage.addListener((message) => {
	switch (message.action) {
		case "refresh-options":
			init();
			break;
		case "notify":
			notify(message.data);
			break;
		case "incrementBadgeValue":
			incrementBadgeValue(message.data);
			break;
		case "animateToolbarIcon":
			console.log("received animateToolbarIcon");
			animateToolbarIcon();
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

	browser.browserAction.onClicked.addListener(async (tab) => {
		enabled = !enabled;
		if(enabled) notify("Neat URL is now enabled", "state");
		if(!enabled) notify("Neat URL is now disabled", "state");

		await browser.storage.local.set({ enabled: enabled });
		sendMessage("refresh-options", enabled);
		enabled_2 = enabled; // shared.js loaded as background script

		updateIcon();
	});
}

/// Context menus
function initContextMenus(){
	browser.contextMenus.onClicked.removeListener(listener);
	browser.contextMenus.removeAll().catch(null);
	
	createContextMenu("neaturl-tb-preferences", "Preferences", ["browser_action"]);
	browser.contextMenus.onClicked.addListener(listener);
}

function createContextMenu(id, title, contexts){
	browser.contextMenus.create({
		id: id,
		title: title,
		contexts: contexts
	});
}

function listener(info, tab){
	if(info.menuItemId == "neaturl-tb-preferences"){
		browser.runtime.openOptionsPage();
		return;
	}
}

/// Neat URL code
function deleteDefaultParametersFromBlockedParameters(){
// Delete all parameters from the user storage that are already contained in the default parameters
// The default parameters will be editable, but only the offset will be saved
// That makes future updates easier

	let oldVersion = neat_url_version;
	let newVersion = browser.runtime.getManifest().version;
	// Upgrade value in browser.storage.local if oldVersion != newVersion
	oldVersion = "1.0.0";
	if(oldVersion != newVersion){
		let changes = false;
		let defaultParams = neat_url_default_blocked_params;
		
		for(let defaultParam of defaultParams){
			if(defaultParam.endsWith("_*")){
				let paramToFind = defaultParam.replace("_*", "_");
				let lengthBefore = neat_url_blocked_params.length;
				neat_url_blocked_params = neat_url_blocked_params.filter((blocked) => !blocked.startsWith(paramToFind));
				let lengthAfter = neat_url_blocked_params.length;

				if(lengthAfter != lengthBefore){
					changes = true;
				}
			}

			if(neat_url_blocked_params.includes(defaultParam)){
				neat_url_blocked_params = removeFromArray(neat_url_blocked_params, defaultParam);
				changes = true;
			}
		}

		if(changes){
			browser.storage.local.set({"neat_url_blocked_params": neat_url_blocked_params.join(', ')})
		}

		browser.storage.local.set({"neat_url_version": newVersion});
	}
}

function notify(message, id){
	if(typeof id == undefined) id = message.substring(0, 20)
	browser.notifications.create(id,
	{
		type: "basic",
		iconUrl: browser.runtime.getURL(resolveIconUrlNotif("neaturl-96-state0.png")),
		title: "Neat URL",
		message: message
	});
}

