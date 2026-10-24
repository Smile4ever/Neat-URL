// End-to-end test: loads dist/<browser> in a real browser and navigates to every URL in test/cases.json.
// All host names resolve to a local HTTPS server, so domain-specific rules can be tested.
// Usage: node test/e2e/run.mjs [chrome] [firefox]   (run `npm run build` first)
// Requires: puppeteer (npm install) with its browsers (npx puppeteer browsers install chrome firefox) and openssl.
import puppeteer from "puppeteer";
import https from "node:https";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 8443;
const ONLY = (process.argv.find((arg) => arg.startsWith("--only=")) || "").substring(7);
const CASES = JSON.parse(fs.readFileSync(path.join(ROOT, "test/cases.json"), "utf8")).filter((c) => c.e2e !== false && c.name.includes(ONLY));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const toLocal = (url) => url.replace(/^https?:\/\/([^/:?#]+)(:\d+)?/, "https://$1:" + PORT);

function certificate(){
	let dir = path.join(os.tmpdir(), "neat-url-e2e-cert");
	let key = path.join(dir, "key.pem");
	let cert = path.join(dir, "cert.pem");
	if(!fs.existsSync(cert)){
		fs.mkdirSync(dir, { recursive: true });
		execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "30", "-subj", "/CN=neat-url-e2e"], { stdio: "ignore" });
	}
	return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

// Chrome: the options page of the extension is used to change the preferences and read the counter
async function launchChrome(){
	let browser = await puppeteer.launch({
		browser: "chrome", headless: true, pipe: true, enableExtensions: true, acceptInsecureCerts: true,
		args: ["--host-resolver-rules=MAP * 127.0.0.1", "--ignore-certificate-errors"]
	});
	let id = await browser.installExtension(path.join(ROOT, "dist/chrome"));
	await wait(1500); // let the background start

	let options = await browser.newPage();
	let optionsErrors = [];
	options.on("pageerror", (error) => optionsErrors.push(error.message));
	options.on("console", (message) => { if(message.type() == "error") optionsErrors.push(message.text()); });
	await options.goto(`chrome-extension://${id}/options.html`);
	await wait(500);
	console.log("options page errors: " + JSON.stringify(optionsErrors));
	console.log("host permission granted: " + await options.evaluate(`chrome.permissions.contains({ origins: ["<all_urls>"] })`));

	// Record every redirect, to show them when a case fails
	let worker = await (await browser.waitForTarget((t) => t.type() == "service_worker")).worker();
	await worker.evaluate(`self.e2eRedirects = []; chrome.webRequest.onBeforeRedirect.addListener((d) => e2eRedirects.push(d.redirectUrl), { urls: ["<all_urls>"] });`);

	return {
		browser,
		optionsErrors,
		setPrefs: async (prefs) => {
			await options.evaluate(`chrome.storage.local.set(${JSON.stringify(prefs)})`);
			await wait(1500); // the rules are rebuilt
		},
		clearRedirects: () => worker.evaluate("e2eRedirects.length = 0"),
		redirects: () => worker.evaluate("e2eRedirects"),
		// The log page shows the cleaned URLs, with the removed parameters struck through
		logPage: async () => {
			let page = await browser.newPage();
			let errors = [];
			page.on("pageerror", (error) => errors.push(error.message));
			await page.goto(`chrome-extension://${id}/options.html#log`);
			await wait(500);
			let result = await page.evaluate(`({
				rows: document.querySelectorAll("#log li").length,
				removed: document.querySelectorAll("#log del").length,
				paypal: Array.from(document.querySelectorAll(".cleaned")).some((n) => n.textContent.endsWith("/paypalme/Smile4ever/10"))
			})`);
			await page.close();
			return Object.assign(result, { errors });
		},
		counted: async () => {
			let badge = await options.evaluate(`chrome.storage.session.get("neat_url_badge")`);
			return Object.values(badge.neat_url_badge || {}).reduce((a, b) => a + b, 0);
		},
		// Sync preferences (#123) with the real storage.sync of the service worker. Another device is
		// simulated by writing to storage.sync from the options page.
		syncCheck: async () => {
			await options.evaluate(`chrome.runtime.sendMessage({ action: "sync-enable", use: "local" })`);
			await options.evaluate(`chrome.storage.local.set({ neat_url_blacklist: "sync.example" })`);
			await wait(3500);
			let uploaded = await options.evaluate(`chrome.storage.sync.get(null).then((items) => NeatURL.sync.fromSyncItems(items).prefs.neat_url_blacklist)`);

			await options.evaluate(`chrome.storage.sync.get(null).then((items) => {
				let synced = NeatURL.sync.fromSyncItems(items);
				let prefs = Object.assign({}, synced.prefs, { neat_url_blacklist: "remote.example" });
				return chrome.storage.sync.set(NeatURL.sync.toSyncItems(prefs, synced.version, Date.now()));
			})`);
			await wait(1500);
			let downloaded = await options.evaluate(`chrome.storage.local.get("neat_url_blacklist").then((r) => r.neat_url_blacklist)`);

			await options.evaluate(`chrome.runtime.sendMessage({ action: "sync-disable" })`);
			return { ok: uploaded == "sync.example" && downloaded == "remote.example", text: `uploaded ${uploaded}, downloaded ${downloaded}` };
		}
	};
}

// Firefox: WebDriver BiDi can't open moz-extension:// pages, so for every config a copy of the build is
// installed with a script that stores the preferences when the background starts
async function launchFirefox(){
	// FIREFOX_EXECUTABLE tests another Firefox version, for example the minimum version
	let browser = await puppeteer.launch({
		browser: "firefox", headless: true, acceptInsecureCerts: true,
		executablePath: process.env.FIREFOX_EXECUTABLE || undefined,
		extraPrefsFirefox: {
			"network.dns.forceResolve": "127.0.0.1",
			"network.trr.mode": 5,
			"dom.security.https_first": false
		}
	});
	let variantRoot = fs.mkdtempSync(path.join(os.tmpdir(), "neat-url-e2e-firefox-"));
	let variant = 0;

	// A copy of the build that runs script in the background, first or after all other scripts
	let installVariant = async (script, last) => {
		let dir = path.join(variantRoot, String(variant++));
		fs.cpSync(path.join(ROOT, "dist/firefox"), dir, { recursive: true });
		fs.writeFileSync(path.join(dir, "e2e-config.js"), script);
		let manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
		if(last) manifest.background.scripts.push("e2e-config.js");
		else manifest.background.scripts.unshift("e2e-config.js");
		fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));
		await browser.installExtension(dir);
	};

	return {
		browser,
		setPrefs: async (prefs) => {
			await installVariant(`browser.storage.local.set(${JSON.stringify(prefs)});\n`);
			await wait(2500); // the new copy must have stored its preferences
		},
		// Sync preferences (#123) with the real storage.sync. The background can't be reached from here, so after
		// a successful upload it blocks the parameter e2esync, and a navigation shows the result.
		syncCheck: async (page) => {
			await installVariant(`browser.storage.local.set({ neat_url_blocked_params: "", neat_url_blacklist: "sync.example", neat_url_sync: true, neat_url_sync_pending: Date.now() })
				.then(() => NeatURL.backgroundSync.upload())
				.then(() => browser.storage.sync.get(null))
				.then((items) => {
					let synced = NeatURL.sync.fromSyncItems(items);
					if(synced && synced.prefs.neat_url_blacklist == "sync.example") return browser.storage.local.set({ neat_url_sync: false, neat_url_blacklist: "", neat_url_blocked_params: "e2esync" });
				});\n`, true);
			await wait(3500);
			await page.goto("about:blank");
			await page.goto(toLocal("https://example.com/?e2esync=1&x=1"), { waitUntil: "load" });
			let ok = page.url() == toLocal("https://example.com/?x=1");
			return { ok, text: ok ? "uploaded sync.example" : "not uploaded: " + page.url() };
		},
		cleanup: () => fs.rmSync(variantRoot, { recursive: true, force: true })
	};
}

// Option "Change links in page": a link in the page, and a link that the page adds later and that is clicked
async function testLinksInPage(driver, page){
	await driver.setPrefs({ neat_url_use_default_params: true, neat_url_blocked_params: "", neat_url_override_default_blocked_params: "", neat_url_websites: "all_except", neat_url_blacklist: "", neat_url_whitelist: "", neat_url_change_links_in_page: true });
	await page.goto("about:blank");
	await page.goto(toLocal("https://example.com/links-page"), { waitUntil: "load" });
	await wait(1500); // the second link is added after 500 ms

	let first = await page.evaluate(`document.querySelector("#first").href`);
	let later = await page.evaluate(`(() => {
		let link = document.querySelector("#later");
		link.addEventListener("click", (e) => e.preventDefault());
		link.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		return link.href;
	})()`);

	let failures = 0;
	for(let [name, actual, expected] of [
		["change links in page: link in the page", first, toLocal("https://www.example.org/?a=1")],
		["change links in page: link added later, when it is used", later, toLocal("https://www.example.org/later")]
	]){
		let ok = actual == expected;
		if(!ok) failures++;
		console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `\n     expected: ${expected}\n     actual:   ${actual}`}`);
	}
	return failures;
}

async function run(name){
	console.log(`\n== ${name} ==`);
	let driver = name == "chrome" ? await launchChrome() : await launchFirefox();
	let browser = driver.browser;
	let failures = 0;

	try{
		let page = await browser.newPage();
		let currentConfig = null;

		for(let c of CASES){
			let config = JSON.stringify(c.config || {});
			if(config != currentConfig){
				let caseConfig = c.config || {};
				let prefs = {
					neat_url_use_default_params: caseConfig.useDefaults !== false,
					neat_url_blocked_params: caseConfig.blocked || "",
					neat_url_override_default_blocked_params: caseConfig.overrides || "",
					neat_url_websites: caseConfig.websites || "all_except",
					neat_url_blacklist: caseConfig.blacklist || "",
					neat_url_whitelist: caseConfig.whitelist || "",
					neat_url_clean_nested: caseConfig.cleanNested === true,
					neat_url_keep_signed_urls: caseConfig.keepSigned !== false,
					neat_url_remove_text_fragments: caseConfig.textFragments === true,
					neat_url_change_links_in_page: false
				};
				await driver.setPrefs(prefs);
				currentConfig = config;
			}

			let expected = toLocal(c.expected);
			let actual = expected;
			if(driver.clearRedirects) await driver.clearRedirects();
			try{
				// A URL that differs only in the fragment would be a same-document navigation without a request
				await page.goto("about:blank");
				await page.goto(toLocal(c.url), { waitUntil: "load" });
				actual = page.url();
			}catch(error){
				actual = "ERROR " + error.message;
			}
			// Chrome replaces some navigations by a new one (tabs.update, see chrome.js),
			// which aborts the first navigation, or happens just after it
			if((c.nested || c.fallback) && name == "chrome"){
				await wait(1000);
				actual = page.url();
			}

			let ok = actual == expected;
			if(!ok) failures++;
			console.log(`${ok ? "ok  " : "FAIL"} ${c.name}${ok ? "" : `\n     url:      ${toLocal(c.url)}\n     expected: ${expected}\n     actual:   ${actual}`}`);
			if(!ok && driver.redirects) console.log("     redirects: " + JSON.stringify(await driver.redirects()));
		}

		if("change links in page".includes(ONLY)) failures += await testLinksInPage(driver, page);

		if(driver.syncCheck && ONLY == ""){
			let result = await driver.syncCheck(page);
			if(!result.ok) failures++;
			console.log(`${result.ok ? "ok  " : "FAIL"} sync preferences: ${result.text}`);
		}

		if(driver.logPage && ONLY == ""){
			let log = await driver.logPage();
			let ok = log.rows > 0 && log.removed > 0 && log.paypal && log.errors.length == 0;
			if(!ok) failures++;
			console.log(`${ok ? "ok  " : "FAIL"} log page: ${log.rows} URLs, ${log.removed} removed parameters marked${log.errors.length ? ", errors: " + log.errors.join("; ") : ""}`);
		}

		if(driver.optionsErrors && driver.optionsErrors.length > 0) failures++;
		if(driver.counted){
			let counted = await driver.counted();
			console.log(`counter: ${counted} cleaned URLs counted`);
			if(counted == 0) failures++;
		}
	}finally{
		await browser.close();
		if(driver.cleanup) driver.cleanup();
	}

	console.log(`${name}: ${failures == 0 ? "all passed" : failures + " failed"}`);
	return failures;
}

const LINKS_PAGE = `<!doctype html><title>Links</title>
<a id="first" href="${toLocal("https://www.example.org/?utm_source=x&a=1")}">first</a>
<script>setTimeout(() => {
	let link = document.createElement("a");
	link.id = "later";
	link.href = "${toLocal("https://www.example.org/later?fbclid=1")}";
	link.textContent = "later";
	document.body.appendChild(link);
}, 500);</script>`;

let server = https.createServer(certificate(), (request, response) => {
	response.setHeader("Content-Type", "text/html");
	if(request.url.startsWith("/links-page")) response.end(LINKS_PAGE);
	else response.end("<!doctype html><title>Neat URL e2e</title>" + request.headers.host + request.url);
}).listen(PORT, "127.0.0.1");

let targets = process.argv.slice(2).filter((arg) => ["chrome", "firefox"].includes(arg));
if(targets.length == 0) targets = ["chrome", "firefox"];

let failures = 0;
try{
	for(let target of targets) failures += await run(target);
}finally{
	server.close();
}
process.exit(failures == 0 ? 0 : 1);
