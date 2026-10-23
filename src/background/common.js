// Background code shared by Firefox (event page) and Chrome (service worker).
// The background can be suspended at any time, so:
// * all listeners are registered synchronously at the top level
// * state that must survive a suspension is kept in storage, not in variables
globalThis.browser = globalThis.browser || globalThis.chrome;

(function(root){
	"use strict";
	const NeatURL = root.NeatURL;
	const PREF_KEYS = Object.keys(NeatURL.defaults.PREFS);
	const ENABLED_KEY = "neat_url_enabled"; // runtime toggle of the toolbar button, reset on browser start
	const BADGE_KEY = "neat_url_badge"; // counts per tab, in storage.session

	let version = browser.runtime.getManifest().version;
	let state = null; // { prefs, config, types, enabled }
	let statePromise = null;
	let stateListeners = [];

	/// State
	async function fetchText(path){
		let response = await fetch(browser.runtime.getURL(path));
		return response.text();
	}

	async function loadDefaultParams(){
		let json = JSON.parse(await fetchText("data/default-params-by-category.json"));
		return json.categories.flatMap((category) => category.params);
	}

	async function loadState(){
		let [stored, defaultParams, suffixText] = await Promise.all([
			browser.storage.local.get(PREF_KEYS.concat(["neat_url_version", "neat_url_hidden_params", ENABLED_KEY])),
			loadDefaultParams(),
			fetchText("data/publicsuffix-ccSLD.txt")
		]);

		let migration = NeatURL.migrate.migrate(stored, version, defaultParams);
		if(Object.keys(migration.changes).length > 0){
			await browser.storage.local.set(migration.changes);
			Object.assign(stored, migration.changes);
		}

		let prefs = NeatURL.defaults.getDefaultPrefs();
		for(let key of PREF_KEYS){
			if(stored[key] != undefined) prefs[key] = stored[key];
		}

		let config = NeatURL.params.compileConfig({
			defaultParams: defaultParams,
			overrides: prefs.neat_url_override_default_blocked_params,
			blockedParams: prefs.neat_url_blocked_params,
			blacklist: prefs.neat_url_blacklist,
			cleanNested: prefs.neat_url_clean_nested,
			keepSigned: prefs.neat_url_keep_signed_urls,
			suffixList: suffixText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line != "")
		});

		if(prefs.neat_url_logging && config.invalid.length > 0) console.warn("[Neat URL]: ignoring invalid parameters", config.invalid);

		let types = NeatURL.params.parseList(prefs.neat_url_types);
		if(types.length == 0) types = ["main_frame"];

		return { prefs: prefs, config: config, types: types, enabled: stored[ENABLED_KEY] !== false };
	}

	function ensureState(){
		if(statePromise == null){
			statePromise = loadState().then((loaded) => {
				state = loaded;
				applyState();
				for(let listener of stateListeners) listener(state);
				return state;
			}).catch((error) => {
				statePromise = null;
				throw error;
			});
		}
		return statePromise;
	}

	function reloadState(){
		statePromise = null;
		return ensureState();
	}

	function getState(){
		return state;
	}

	function onStateChanged(listener){
		stateListeners.push(listener);
	}

	function log(...args){
		if(state && state.prefs.neat_url_logging) console.log("[Neat URL]:", ...args);
	}

	/// Toolbar icon
	function resolveIconByTheme(file, theme){
		return "icons/" + theme + "/" + file;
	}

	function iconTheme(){
		return state ? state.prefs.neat_url_icon_theme : "dark";
	}

	function resolveIconURL(file){
		let theme = iconTheme().replace("_notiflight", "").replace("_notifdark", "");
		return resolveIconByTheme(file, theme);
	}

	function resolveIconUrlNotif(file){
		let theme = iconTheme();
		if(theme.includes("_notiflight")) return resolveIconByTheme(file, "light");
		if(theme.includes("_notifdark")) return resolveIconByTheme(file, "dark");
		return resolveIconByTheme(file, theme);
	}

	function applyState(){
		let enabled = state.enabled;
		browser.action.setIcon({ path: resolveIconURL(enabled ? "neaturl-96-state0.png" : "neaturl-96-state0_disabled.png") });
		browser.action.setTitle({ title: "Neat URL " + version + " - " + (enabled ? "enabled" : "disabled") });

		if(!state.prefs.neat_url_counter_default_color){
			browser.action.setBadgeBackgroundColor({ color: state.prefs.neat_url_counter_color });
		}
		if(!state.prefs.neat_url_show_counter){
			browser.action.setBadgeText({ text: "" });
		}
	}

	function animateToolbarIcon(){
		let animation = state.prefs.neat_url_icon_animation;
		if(animation == "none") return;

		let defaultState = resolveIconURL("neaturl-96-state0.png");
		let imagesMissingUnderscore = [resolveIconURL("neaturl-96-state-1.png"), defaultState, resolveIconURL("neaturl-96-state-1.png")];
		let imagesRotate = [resolveIconURL("neaturl-96-state1.png"), resolveIconURL("neaturl-96-state2.png"), resolveIconURL("neaturl-96-state3.png")];
		let images = [];

		if(animation == "missing_underscore") images = imagesMissingUnderscore;
		if(animation == "rotate") images = imagesRotate;
		if(animation == "surprise_me") images = Math.floor(Math.random() * 2) == 0 ? imagesMissingUnderscore : imagesRotate;
		if(images.length == 0) return;

		let time = 350 * images.length;
		browser.action.setIcon({ path: images[0] });
		setTimeout(() => browser.action.setIcon({ path: images[1] }), 1 * time);
		setTimeout(() => browser.action.setIcon({ path: images[2] }), 2 * time);
		setTimeout(() => browser.action.setIcon({ path: state.enabled ? defaultState : resolveIconURL("neaturl-96-state0_disabled.png") }), 3 * time);
	}

	/// Counter
	async function getBadgeCounts(){
		let result = await browser.storage.session.get(BADGE_KEY);
		return result[BADGE_KEY] || {};
	}

	async function updateBadgeText(tabId){
		if(!state || !state.prefs.neat_url_show_counter) return;
		let counts = await getBadgeCounts();
		let count = counts[tabId];
		browser.action.setBadgeText({ text: count ? String(count) : "" });
	}

	async function incrementBadgeValue(tabId){
		if(tabId == -1) return; // The request is unrelated to a tab
		let counts = await getBadgeCounts();
		counts[tabId] = (counts[tabId] || 0) + 1;
		await browser.storage.session.set({ [BADGE_KEY]: counts });

		let [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
		if(activeTab && activeTab.id == tabId) updateBadgeText(tabId);
	}

	// Called by the platform code when a URL was cleaned
	function reportCleaned(details, newUrl){
		log(`(type ${details.type}): '${details.url}' has been changed to '${newUrl}'`);
		animateToolbarIcon();
		if(state.prefs.neat_url_show_counter) incrementBadgeValue(details.tabId);
	}

	browser.tabs.onActivated.addListener((activeInfo) => {
		ensureState().then(() => updateBadgeText(activeInfo.tabId));
	});

	browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		// Tabs can be updated in the background. We're not interested in that.
		if(!tab.active || changeInfo.status == undefined) return;
		ensureState().then(() => updateBadgeText(tabId));
	});

	browser.tabs.onRemoved.addListener(async (tabId) => {
		// Reset the count, so a new tab with the same id doesn't get the count of the removed tab
		let counts = await getBadgeCounts();
		if(counts[tabId] == undefined) return;
		delete counts[tabId];
		await browser.storage.session.set({ [BADGE_KEY]: counts });
	});

	/// Toggle
	browser.action.onClicked.addListener(async () => {
		await ensureState();
		await browser.storage.local.set({ [ENABLED_KEY]: !state.enabled });
		// storage.onChanged reloads the state
	});

	/// Context menu
	function createContextMenus(){
		browser.contextMenus.removeAll().then(() => {
			browser.contextMenus.create({ id: "neaturl-tb-preferences", title: "Preferences", contexts: ["action"] });
		});
	}

	browser.contextMenus.onClicked.addListener((info) => {
		if(info.menuItemId == "neaturl-tb-preferences") browser.runtime.openOptionsPage();
	});

	/// Notifications
	function notify(message){
		browser.notifications.create(message.substring(0, 20), {
			type: "basic",
			iconUrl: browser.runtime.getURL(resolveIconUrlNotif("neaturl-96-state0.png")),
			title: "Neat URL",
			message: message
		});
	}

	// The config for the content script that changes links in the page (src/content/links.js)
	function getContentConfig(state){
		return {
			enabled: state.enabled,
			changeLinks: state.prefs.neat_url_change_links_in_page,
			logging: state.prefs.neat_url_logging,
			config: {
				entries: state.config.entries,
				blacklist: state.config.blacklist,
				cleanNested: state.config.cleanNested,
				keepSigned: state.config.keepSigned,
				suffixList: Array.from(state.config.suffixSet)
			}
		};
	}

	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		switch(message.action){
			case "refresh-options":
				reloadState();
				break;
			case "notify":
				ensureState().then(() => notify(message.data));
				break;
			case "get-config":
				ensureState().then((state) => sendResponse(getContentConfig(state)));
				return true; // sendResponse is called asynchronously
		}
	});

	/// Lifecycle
	browser.storage.onChanged.addListener((changes, area) => {
		if(area != "local") return;
		if(Object.keys(changes).some((key) => PREF_KEYS.includes(key) || key == ENABLED_KEY)) reloadState();
	});

	browser.runtime.onStartup.addListener(() => {
		createContextMenus();
		// Neat URL is always enabled after a restart of the browser
		browser.storage.local.set({ [ENABLED_KEY]: true });
	});

	browser.runtime.onInstalled.addListener(() => {
		createContextMenus();
		ensureState();
	});

	NeatURL.background = { ensureState, reloadState, getState, onStateChanged, reportCleaned, log, version };
})(globalThis);
