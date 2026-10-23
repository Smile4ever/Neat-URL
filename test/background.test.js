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

function createBrowser(initialStorage, options){
	options = options || {};
	let local = Object.assign({}, initialStorage);
	let session = {};
	let onChanged = event();
	let area = (store, name) => ({
		get: async (keys) => {
			let result = {};
			for(let key of [].concat(keys)) if(store[key] !== undefined) result[key] = JSON.parse(JSON.stringify(store[key]));
			return result;
		},
		set: async (values) => {
			let changes = {};
			for(let key of Object.keys(values)){
				changes[key] = { oldValue: store[key], newValue: values[key] };
				store[key] = values[key];
			}
			if(name == "local") setTimeout(() => onChanged.fire(changes, name), 0);
		}
	});

	return {
		local: local,
		sessionData: session,
		runtime: { getManifest: () => ({ version: "5.0.0" }), getURL: (p) => p, onMessage: event(), onStartup: event(), onInstalled: event(), openOptionsPage: () => {} },
		storage: { local: area(local, "local"), session: area(session, "session"), onChanged: onChanged },
		action: { setIcon: () => {}, setTitle: () => {}, setBadgeText: () => {}, setBadgeBackgroundColor: () => {}, onClicked: event() },
		contextMenus: { onClicked: event(), removeAll: async () => {}, create: () => {} },
		tabs: { onActivated: event(), onUpdated: event(), onRemoved: event(), query: async () => [], update: () => {} },
		notifications: { create: () => {} },
		webRequest: { onBeforeRequest: event() },
		fetchDelay: options.fetchDelay || 0
	};
}

function loadBackground(browser){
	let context = {
		browser: browser,
		console: console,
		URL: URL,
		setTimeout: setTimeout,
		fetch: (file) => new Promise((resolve) => setTimeout(() => resolve({ text: async () => fs.readFileSync(path.join(ROOT, file), "utf8") }), browser.fetchDelay))
	};
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

test("toggle works after saving the preferences (B5)", async () => {
	let browser = createBrowser();
	let context = loadBackground(browser);
	await context.NeatURL.background.ensureState();
	let listener = browser.webRequest.onBeforeRequest.listeners[0];

	// Save preferences twice, like the options page does
	await browser.storage.local.set({ neat_url_logging: false });
	await wait(50);
	await browser.storage.local.set({ neat_url_logging: false });
	await wait(50);

	assert.strictEqual(browser.action.onClicked.listeners.length, 1);
	await Promise.all(browser.action.onClicked.fire());
	await wait(50);
	assert.strictEqual(listener(request("https://example.com/?utm_source=a")), undefined, "disabled after one click");

	await Promise.all(browser.action.onClicked.fire());
	await wait(50);
	assert.strictEqual(listener(request("https://example.com/?utm_source=a")).redirectUrl, "https://example.com/");
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
});
