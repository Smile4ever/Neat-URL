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
	const LOG_KEY = "neat_url_log"; // the last cleaned URLs for the Log tab of the options page, in storage.session (memory only)
	const LOG_SINCE_KEY = "neat_url_log_since"; // when the log started: browser start or Clear on the Log tab, in storage.session
	const LOG_SIZE = 500;
	const LINKUMORI_NOTICE_KEY = "neat_url_linkumori_notice"; // the options page explains once what happened to the Linkumori settings

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
			browser.storage.local.get(PREF_KEYS.concat(["neat_url_version", "neat_url_hidden_params", ENABLED_KEY, LINKUMORI_NOTICE_KEY], NeatURL.migrate.LINKUMORI_KEYS)),
			loadDefaultParams(),
			fetchText("data/publicsuffix-ccSLD.txt")
		]);

		let migration = NeatURL.migrate.migrate(stored, version, defaultParams);
		// Only the import from Linkumori removes keys: this update replaced Linkumori, so show once what happened to its settings.
		// Storing the changes reloads the state, which can see the Linkumori keys again before they are removed:
		// the notice is stored with the changes, and the options page only opens the first time.
		let fromLinkumori = migration.remove.length > 0;
		let noticeShown = stored[LINKUMORI_NOTICE_KEY] === true;
		if(fromLinkumori) migration.changes[LINKUMORI_NOTICE_KEY] = true;
		if(Object.keys(migration.changes).length > 0){
			await browser.storage.local.set(migration.changes);
			Object.assign(stored, migration.changes);
		}
		if(fromLinkumori){
			await browser.storage.local.remove(migration.remove);
			if(!noticeShown) openOptionsTab("preferences").catch((error) => console.error("[Neat URL]: could not open the options", error));
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

		if(config.invalid.length > 0) console.warn("[Neat URL]: ignoring invalid parameters", config.invalid);

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

	// Cleaned URLs are shown on the Log tab of the options page, this is for debugging only
	function log(...args){
		console.debug("[Neat URL]:", ...args);
	}

	/// Toolbar icon
	function resolveIconByTheme(file, theme){
		return "icons/" + theme + "/" + file;
	}

	function iconTheme(){
		return state ? state.prefs.neat_url_icon_theme : "dark";
	}

	function resolveIconURL(file){
		return resolveIconByTheme(file, iconTheme());
	}

	function applyState(){
		let enabled = state.enabled;
		browser.action.setIcon({ path: resolveIconURL(enabled ? "neaturl-96-state0.png" : "neaturl-96-state0_disabled.png") });
		browser.action.setTitle({ title: "Neat URL " + version + " - " + (enabled ? "enabled" : "disabled") });
		// The menu may not exist yet right after the start, createContextMenus() then uses the state
		try{
			Promise.resolve(browser.contextMenus.update("neaturl-tb-enabled", { checked: enabled })).catch(() => {});
		}catch(error){}

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
	/// Log for the Log tab of the options page. storage.session is kept in memory and survives a suspended background.
	let logQueue = Promise.resolve();

	// storage.session is empty after a browser start, and the background runs again after a suspension
	browser.storage.session.get(LOG_SINCE_KEY).then((result) => {
		if(!(LOG_SINCE_KEY in result)) return browser.storage.session.set({ [LOG_SINCE_KEY]: Date.now() });
	}).catch((error) => console.error("[Neat URL]: could not start the log", error));

	function addLogEntry(entry){
		logQueue = logQueue.then(async () => {
			let result = await browser.storage.session.get(LOG_KEY);
			let entries = (result[LOG_KEY] || []).concat(entry).slice(-LOG_SIZE);
			await browser.storage.session.set({ [LOG_KEY]: entries });
		}).catch((error) => console.error("[Neat URL]: could not update the log", error));
	}

	function reportCleaned(details, newUrl){
		let applied = new Set();
		NeatURL.clean.cleanUrl(details.url, state.config, { applied });
		addLogEntry({ time: Date.now(), type: details.type, tabId: details.tabId, url: details.url, cleaned: newUrl, rules: Array.from(applied) });
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

	/// Toolbar button: opens the options page with the URL of the tab in "Test a URL"
	browser.action.onClicked.addListener((tab) => {
		let url = tab && /^https?:\/\//i.test(tab.url || "") ? tab.url : null;
		openOptionsTab("preferences", url).catch((error) => console.error("[Neat URL]: could not open the options", error));
	});

	/// Context menu of the toolbar button: enable/disable, preferences and log
	function createContextMenus(){
		browser.contextMenus.removeAll().then(() => {
			browser.contextMenus.create({ id: "neaturl-tb-enabled", type: "checkbox", checked: state ? state.enabled : true, title: browser.i18n.getMessage("menu_enabled"), contexts: ["action"] });
			browser.contextMenus.create({ id: "neaturl-tb-preferences", title: browser.i18n.getMessage("preferences"), contexts: ["action"] });
			browser.contextMenus.create({ id: "neaturl-tb-log", title: browser.i18n.getMessage("show_log"), contexts: ["action"] });
		});
	}

	// Opens the options page on a view (#preferences or #log), in the tab that is already open if there is one.
	// testUrl is put in "Test a URL". An open options page gets a message, so it doesn't reload and keeps unsaved changes.
	async function openOptionsTab(view, testUrl){
		let page = browser.runtime.getURL("options.html");
		let tabs = (await browser.tabs.query({})).filter((tab) => tab.url && tab.url.startsWith(page));
		if(tabs.length == 0){
			await browser.tabs.create({ url: page + (testUrl ? "?test=" + encodeURIComponent(testUrl) : "") + "#" + view });
			return;
		}
		await browser.tabs.update(tabs[0].id, { active: true });
		await browser.windows.update(tabs[0].windowId, { focused: true });
		await browser.runtime.sendMessage({ action: "show-options", view: view, testUrl: testUrl }).catch(() => {});
	}

	browser.contextMenus.onClicked.addListener((info) => {
		if(info.menuItemId == "neaturl-tb-preferences") openOptionsTab("preferences");
		if(info.menuItemId == "neaturl-tb-log") openOptionsTab("log");
		// storage.onChanged reloads the state
		if(info.menuItemId == "neaturl-tb-enabled") browser.storage.local.set({ [ENABLED_KEY]: info.checked });
	});

	// The config for the content script that changes links in the page (src/content/links.js)
	function getContentConfig(state){
		return {
			enabled: state.enabled,
			changeLinks: state.prefs.neat_url_change_links_in_page,
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
