"use strict";
// Runs the Firefox background scripts against a fake browser API
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { ROOT } = require("./helpers.js");

const SCRIPTS = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8")).background.scripts;

function event(){
	let listeners = [];
	return {
		listeners: listeners,
		addListener: (fn) => listeners.push(fn),
		removeListener: (fn) => listeners.splice(listeners.indexOf(fn), 1),
		fire: (...args) => listeners.map((fn) => fn(...args))
	};
}

// The storage.sync of an account: every device (createBrowser with options.cloud) gets its storage.onChanged
function createCloud(){
	return { store: {}, devices: [] };
}

function createBrowser(initialStorage, options){
	options = options || {};
	let local = Object.assign({}, initialStorage);
	let session = {};
	let onChanged = event();
	let cloud = options.cloud || createCloud();
	let fire = (changes, name) => {
		if(name == "local") setTimeout(() => onChanged.fire(changes, name), 0);
		if(name == "sync") for(let device of cloud.devices) setTimeout(() => device.fire(changes, name), 0);
	};
	let area = (store, name) => ({
		get: async (keys) => {
			let result = {};
			for(let key of keys == null ? Object.keys(store) : [].concat(keys)) if(store[key] !== undefined) result[key] = JSON.parse(JSON.stringify(store[key]));
			return result;
		},
		set: async (values) => {
			let changes = {};
			for(let key of Object.keys(values)){
				changes[key] = { oldValue: store[key], newValue: values[key] };
				store[key] = values[key];
			}
			fire(changes, name);
		},
		remove: async (keys) => {
			let changes = {};
			for(let key of [].concat(keys)){
				changes[key] = { oldValue: store[key] };
				delete store[key];
			}
			if(name == "sync") fire(changes, name);
		}
	});
	cloud.devices.push(onChanged);

	return {
		local: local,
		sessionData: session,
		runtime: { getManifest: () => ({ version: options.version || "5.0.0" }), getURL: (p) => p, onMessage: event(), onStartup: event(), onInstalled: event(), openOptionsPage: () => {} },
		storage: { local: area(local, "local"), session: area(session, "session"), sync: area(cloud.store, "sync"), onChanged: onChanged },
		action: { setIcon: () => {}, setTitle: () => {}, setBadgeText: () => {}, setBadgeBackgroundColor: () => {}, onClicked: event() },
		contextMenus: { onClicked: event(), removeAll: async () => {}, create: () => {}, update: async () => {} },
		tabs: { onActivated: event(), onUpdated: event(), onRemoved: event(), query: async () => [], update: () => {}, created: [], create: async function(details){ this.created.push(details); } },
		webRequest: { onBeforeRequest: event() },
		fetchDelay: options.fetchDelay || 0
	};
}

function loadBackground(browser, globals){
	let context = {
		browser: browser,
		console: console,
		URL: URL,
		setTimeout: setTimeout,
		clearTimeout: clearTimeout,
		TextEncoder: TextEncoder,
		fetch: (file) => new Promise((resolve) => setTimeout(() => resolve({ text: async () => fs.readFileSync(path.join(ROOT, file), "utf8") }), browser.fetchDelay))
	};
	Object.assign(context, globals);
	context.globalThis = context;
	vm.createContext(context);
	for(let script of SCRIPTS) vm.runInContext(fs.readFileSync(path.join(ROOT, script), "utf8"), context, { filename: script });
	return context;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const request = (url) => ({ url: url, type: "main_frame", tabId: 1 });

test("the webRequest listener is registered synchronously", () => {
	let browser = createBrowser();
	loadBackground(browser);
	assert.strictEqual(browser.webRequest.onBeforeRequest.listeners.length, 1);
});

test("a request during startup waits for the preferences (B3)", async () => {
	let browser = createBrowser({}, { fetchDelay: 50 });
	loadBackground(browser);
	let result = await browser.webRequest.onBeforeRequest.listeners[0](request("https://example.com/?utm_source=a&x=1"));
	assert.strictEqual(result.redirectUrl, "https://example.com/?x=1");
});

test("the menu of the toolbar button enables and disables, also after saving the preferences (B5)", async () => {
	let browser = createBrowser();
	let context = loadBackground(browser);
	await context.NeatURL.background.ensureState();
	let listener = browser.webRequest.onBeforeRequest.listeners[0];

	// Save preferences twice, like the options page does
	await browser.storage.local.set({ neat_url_show_counter: true });
	await wait(50);
	await browser.storage.local.set({ neat_url_show_counter: true });
	await wait(50);

	assert.strictEqual(browser.contextMenus.onClicked.listeners.length, 1);
	browser.contextMenus.onClicked.fire({ menuItemId: "neaturl-tb-enabled", checked: false });
	await wait(50);
	assert.strictEqual(listener(request("https://example.com/?utm_source=a")), undefined, "disabled after one click");

	browser.contextMenus.onClicked.fire({ menuItemId: "neaturl-tb-enabled", checked: true });
	await wait(50);
	assert.strictEqual(listener(request("https://example.com/?utm_source=a")).redirectUrl, "https://example.com/");
});

test("the toolbar button opens the options with the URL of the tab", async () => {
	let browser = createBrowser();
	loadBackground(browser);
	browser.action.onClicked.fire({ url: "https://example.com/?utm_source=a&x=1" });
	browser.action.onClicked.fire({ url: "about:blank" });
	await wait(10);
	assert.deepStrictEqual(browser.tabs.created.map((tab) => tab.url), [
		"options.html?test=" + encodeURIComponent("https://example.com/?utm_source=a&x=1") + "#preferences",
		"options.html#preferences"
	]);
	assert.strictEqual(browser.local.neat_url_enabled, undefined, "a click doesn't disable Neat URL");
});

test("addons.mozilla.org: the tab is loaded again with the clean URL (#136)", async () => {
	let browser = createBrowser({ neat_url_blocked_params: "src@addons.mozilla.org, src@example.com" });
	let updates = [];
	browser.tabs.update = async (tabId, details) => { updates.push([tabId, details.url, details.loadReplace]); };
	let context = loadBackground(browser);
	await context.NeatURL.background.ensureState();
	let onTabUpdated = context.NeatURL.firefox.onTabUpdated;

	onTabUpdated(3, { url: "https://addons.mozilla.org/en-US/firefox/addon/neat-url/?src=search" });
	onTabUpdated(3, { url: "https://addons.mozilla.org/en-US/firefox/addon/neat-url/" });
	onTabUpdated(4, { url: "https://example.com/?src=search" }); // webRequest cleans this one
	onTabUpdated(5, { status: "complete" });
	await wait(10);
	assert.deepStrictEqual(JSON.parse(JSON.stringify(updates)), [[3, "https://addons.mozilla.org/en-US/firefox/addon/neat-url/", true]]);
	assert.strictEqual(browser.sessionData.neat_url_log.length, 1, "in the log");

	await browser.storage.local.set({ neat_url_enabled: false });
	await wait(50);
	onTabUpdated(3, { url: "https://addons.mozilla.org/en-US/firefox/addon/neat-url/?src=search" });
	await wait(10);
	assert.strictEqual(updates.length, 1, "not when Neat URL is disabled");
});

test("Firefox for Android: no menus, no windows and no icon or counter methods", async () => {
	let browser = createBrowser({ neat_url_counter_default_color: false });
	delete browser.contextMenus;
	delete browser.action.setIcon;
	delete browser.action.setBadgeText;
	delete browser.action.setBadgeBackgroundColor;
	let messages = [];
	browser.runtime.sendMessage = async (message) => messages.push(message);
	let context = loadBackground(browser);
	await context.NeatURL.background.ensureState();
	browser.runtime.onInstalled.fire();

	let listener = browser.webRequest.onBeforeRequest.listeners[0];
	assert.strictEqual(listener(request("https://example.com/?utm_source=a&x=1")).redirectUrl, "https://example.com/?x=1");

	// The options page is already open: it gets the URL of the tab without browser.windows
	browser.tabs.query = async () => [{ id: 2, url: "options.html#log" }];
	browser.action.onClicked.fire({ url: "https://example.com/?utm_source=a" });
	await wait(10);
	assert.deepStrictEqual(JSON.parse(JSON.stringify(messages)), [{ action: "show-options", view: "preferences", testUrl: "https://example.com/?utm_source=a" }]);
});

test("the icon theme follows the color scheme of the browser (#252)", async () => {
	let scheme = { matches: false, listeners: [], addEventListener: (type, fn) => scheme.listeners.push(fn) };
	let browser = createBrowser();
	let icons = [];
	browser.action.setIcon = (details) => icons.push(details.path);
	let context = loadBackground(browser, { matchMedia: (query) => query == "(prefers-color-scheme: dark)" ? scheme : null });
	await context.NeatURL.background.ensureState();
	assert.strictEqual(icons.pop(), "icons/dark/neaturl-96-state0.png", "light theme");

	scheme.matches = true;
	scheme.listeners.forEach((fn) => fn());
	assert.strictEqual(icons.pop(), "icons/light/neaturl-96-state0.png", "dark theme");

	await browser.storage.local.set({ neat_url_icon_theme: "dark" });
	await wait(50);
	assert.strictEqual(icons.pop(), "icons/dark/neaturl-96-state0.png", "always dark icons");
	scheme.listeners.forEach((fn) => fn());
	assert.strictEqual(icons.length, 0, "a fixed theme ignores the color scheme");
});

test("the icon theme without matchMedia (service worker of Chrome) uses dark icons", async () => {
	let browser = createBrowser();
	let icons = [];
	browser.action.setIcon = (details) => icons.push(details.path);
	let context = loadBackground(browser);
	await context.NeatURL.background.ensureState();
	assert.deepStrictEqual(icons, ["icons/dark/neaturl-96-state0.png"]);
});

test("migration doesn't remove own parameters on every start (B1, B2)", async () => {
	let browser = createBrowser({ neat_url_version: "5.0.0", neat_url_blocked_params: "utm_source@mysite.com, nb@tweakers.net" });
	for(let i = 0; i < 2; i++){
		let context = loadBackground(browser);
		await context.NeatURL.background.ensureState();
	}
	assert.strictEqual(browser.local.neat_url_blocked_params, "utm_source@mysite.com, nb@tweakers.net");
});

test("own parameters and request types are applied", async () => {
	let browser = createBrowser({ neat_url_blocked_params: "nb@tweakers.net", neat_url_types: "main_frame, sub_frame" });
	let context = loadBackground(browser);
	await context.NeatURL.background.ensureState();
	let listener = browser.webRequest.onBeforeRequest.listeners[0];
	assert.strictEqual(listener(request("https://tweakers.net/?nb=1&x=2")).redirectUrl, "https://tweakers.net/?x=2");
	assert.strictEqual(listener({ url: "https://example.com/?utm_source=a", type: "sub_frame", tabId: 1 }).redirectUrl, "https://example.com/");
	assert.strictEqual(listener({ url: "https://example.com/?utm_source=a", type: "image", tabId: 1 }), undefined);
});

test("the counter counts per tab", async () => {
	let browser = createBrowser();
	let badge = "";
	browser.action.setBadgeText = ({ text }) => { badge = text; };
	browser.tabs.query = async () => [{ id: 1 }];
	let context = loadBackground(browser);
	await context.NeatURL.background.ensureState();
	let listener = browser.webRequest.onBeforeRequest.listeners[0];
	listener(request("https://example.com/?utm_source=a"));
	await wait(50);
	listener(request("https://example.com/?fbclid=a"));
	await wait(50);
	assert.strictEqual(badge, "2");
});

test("cleaned URLs are kept in the log in storage.session", async () => {
	let browser = createBrowser();
	let context = loadBackground(browser);
	await context.NeatURL.background.ensureState();
	let listener = browser.webRequest.onBeforeRequest.listeners[0];
	listener(request("https://www.paypal.com/paypalme/Smile4ever/10?utm_content=product-page-contribute&utm_medium=referral&utm_source=addons.mozilla.org"));
	listener(request("https://example.com/?fbclid=a&x=1"));
	await wait(50);

	let log = browser.sessionData.neat_url_log;
	assert.strictEqual(log.length, 2);
	assert.strictEqual(log[0].cleaned, "https://www.paypal.com/paypalme/Smile4ever/10");
	assert.strictEqual(log[1].url, "https://example.com/?fbclid=a&x=1");
	assert.strictEqual(log[1].cleaned, "https://example.com/?x=1");
	assert.strictEqual(log[1].type, "main_frame");
	// The rules that cleaned the URL, as written in the preferences
	assert.deepStrictEqual(Array.from(log[0].rules), ["utm_*"]);
	assert.deepStrictEqual(Array.from(log[1].rules), ["fbclid"]);
});

test("update from Linkumori: its settings are imported once and the options page explains it", async () => {
	let browser = createBrowser({ PurifyUrlsSettings: { status: true }, customRules: [{ domain: "example.com", param: "ref" }], whitelist: ["bank.example"], theme: "dark" });
	for(let i = 0; i < 2; i++){
		let context = loadBackground(browser);
		await context.NeatURL.background.ensureState();
		await wait(10);
	}
	assert.strictEqual(browser.local.neat_url_blocked_params, "ref@*.example.com");
	assert.strictEqual(browser.local.neat_url_blacklist, "bank.example");
	assert.deepStrictEqual(["PurifyUrlsSettings", "customRules", "whitelist", "theme"].filter((key) => key in browser.local), []);
	assert.strictEqual(browser.local.neat_url_linkumori_notice, true);
	assert.deepStrictEqual(browser.tabs.created.map((tab) => tab.url), ["options.html#preferences"], "opened once");
});

/// Sync preferences (#123): devices with the same storage.sync
const UPLOAD_WAIT = 2300; // UPLOAD_DELAY of src/background/sync.js and some room
const chunksOf = (cloud, pref) => Object.keys(cloud.store).filter((key) => key.startsWith("neat_url_sync_chunk:" + pref + ":"));

function sendMessage(browser, message){
	return new Promise((resolve) => {
		for(let listener of browser.runtime.onMessage.listeners) listener(message, {}, resolve);
	});
}

test("sync: a change on one device arrives on the other device", async () => {
	let cloud = createCloud();
	let a = createBrowser({ neat_url_sync: true }, { cloud });
	let b = createBrowser({ neat_url_sync: true }, { cloud });
	loadBackground(a);
	let contextB = loadBackground(b);
	await wait(20);

	await a.storage.local.set({ neat_url_blocked_params: "nb@tweakers.net" });
	await wait(UPLOAD_WAIT);
	assert.strictEqual(b.local.neat_url_blocked_params, "nb@tweakers.net");
	assert.strictEqual(a.local.neat_url_sync_status.result, "uploaded");
	assert.strictEqual(b.local.neat_url_sync_status.result, "downloaded", "the download is no local change, so device B doesn't upload it again");
	assert.ok(!a.local.neat_url_sync_pending && !b.local.neat_url_sync_pending);
	assert.ok(contextB.NeatURL.background.getState().config.entries.some((e) => e.raw == "nb@tweakers.net"));
});

test("sync: a large list of parameters is split into chunks", async () => {
	let cloud = createCloud();
	let list = Array.from({ length: 3000 }, (_, i) => "param_" + i + "@example.com").join("\n") + "\nnaïve€";
	let a = createBrowser({ neat_url_sync: true }, { cloud });
	let b = createBrowser({ neat_url_sync: true }, { cloud });
	loadBackground(a);
	loadBackground(b);
	await wait(20);

	await a.storage.local.set({ neat_url_blocked_params: list });
	await wait(UPLOAD_WAIT);
	assert.ok(chunksOf(cloud, "neat_url_blocked_params").length > 1);
	assert.strictEqual(b.local.neat_url_blocked_params, list);

	// A shorter list leaves no old chunks behind
	await a.storage.local.set({ neat_url_blocked_params: "x" });
	await wait(UPLOAD_WAIT);
	assert.deepStrictEqual(chunksOf(cloud, "neat_url_blocked_params"), ["neat_url_sync_chunk:neat_url_blocked_params:0"]);
	assert.strictEqual(b.local.neat_url_blocked_params, "x");
});

test("sync: turning it on keeps the preferences of this device or takes the synchronized ones", async () => {
	let cloud = createCloud();
	let a = createBrowser({ neat_url_sync: true }, { cloud });
	let b = createBrowser({ neat_url_blacklist: "b.example" }, { cloud });
	loadBackground(a);
	loadBackground(b);
	await wait(20);
	await a.storage.local.set({ neat_url_blacklist: "a.example" });
	await wait(UPLOAD_WAIT);
	assert.strictEqual(b.local.neat_url_blacklist, "b.example", "off on device B");

	await sendMessage(b, { action: "sync-enable", use: "synced" });
	assert.strictEqual(b.local.neat_url_blacklist, "a.example");

	let c = createBrowser({ neat_url_blacklist: "c.example" }, { cloud });
	loadBackground(c);
	await wait(20);
	await sendMessage(c, { action: "sync-enable", use: "local" });
	await wait(50);
	assert.strictEqual(a.local.neat_url_blacklist, "c.example");
	assert.strictEqual(b.local.neat_url_blacklist, "c.example");

	await sendMessage(b, { action: "sync-disable" });
	await c.storage.local.set({ neat_url_blacklist: "c2.example" });
	await wait(UPLOAD_WAIT);
	assert.strictEqual(a.local.neat_url_blacklist, "c2.example");
	assert.strictEqual(b.local.neat_url_blacklist, "c.example", "off again on device B");
});

test("sync: a change that was not uploaded yet is uploaded at the next start", async () => {
	let cloud = createCloud();
	let b = createBrowser({ neat_url_sync: true }, { cloud });
	loadBackground(b);
	// The background of device A was suspended before the upload
	let a = createBrowser({ neat_url_sync: true, neat_url_whitelist: "late.example", neat_url_sync_pending: Date.now() }, { cloud });
	loadBackground(a);
	await wait(100);
	assert.strictEqual(b.local.neat_url_whitelist, "late.example");
});

test("sync: an older version doesn't use the preferences of a newer version", async () => {
	let cloud = createCloud();
	let newer = createBrowser({ neat_url_sync: true }, { cloud, version: "2099.1.1" });
	let older = createBrowser({ neat_url_sync: true, neat_url_blacklist: "old.example" }, { cloud, version: "2026.10.24" });
	loadBackground(newer);
	loadBackground(older);
	await wait(20);

	await newer.storage.local.set({ neat_url_blacklist: "new.example" });
	await wait(UPLOAD_WAIT);
	assert.strictEqual(older.local.neat_url_blacklist, "old.example");
	assert.strictEqual(older.local.neat_url_sync_status.result, "newer_version");

	await older.storage.local.set({ neat_url_blacklist: "old2.example" });
	await wait(UPLOAD_WAIT);
	assert.strictEqual(newer.local.neat_url_blacklist, "new.example", "the older version doesn't upload");
});
