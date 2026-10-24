// The Log tab of the options page: the cleaned URLs that src/background/common.js keeps in storage.session
globalThis.browser = globalThis.browser || globalThis.chrome;

const LOG_KEY = "neat_url_log";
const LOG_SINCE_KEY = "neat_url_log_since";
let entries = [];
let since = null;
// element() and message() are in options.js

// "?a=1&b=2" with everything that is not in kept marked as removed: the parameters,
// the & between them, and the ? (or #) itself when no parameter is left
function appendParts(parent, separator, original, kept){
	let remaining = kept == "" ? [] : kept.split("&");
	let parts = original.split("&");
	let isKept = parts.map((part) => {
		let found = remaining.indexOf(part);
		if(found < 0) return false;
		remaining.splice(found, 1);
		return true;
	});

	let anyKept = isKept.includes(true);
	parent.appendChild(anyKept ? document.createTextNode(separator) : element("del", null, separator));

	let keptSoFar = 0;
	parts.forEach((part, index) => {
		let ampersand = index > 0 ? "&" : "";
		if(isKept[index]){
			// The & before the first kept parameter belongs to the removed parameters before it
			if(ampersand) parent.appendChild(keptSoFar > 0 ? document.createTextNode(ampersand) : element("del", null, ampersand));
			parent.appendChild(document.createTextNode(part));
			keptSoFar++;
		}else{
			parent.appendChild(element("del", null, ampersand + part));
		}
	});
}

// The original URL with the removed parameters struck through
function renderOriginal(original, cleaned){
	let line = element("div", "original");
	let o, c;
	try{
		o = new URL(original);
		c = new URL(cleaned);
	}catch(ex){
		line.textContent = original;
		return line;
	}

	if(o.origin + o.pathname != c.origin + c.pathname){
		// An ending rule changed the path: show the part that was cut off
		let base = c.origin + c.pathname.replace(/\/$/, "");
		if(original.startsWith(base)){
			line.appendChild(document.createTextNode(base));
			line.appendChild(element("del", null, original.substring(base.length)));
		}else{
			line.textContent = original;
		}
		return line;
	}

	line.appendChild(document.createTextNode(o.origin + o.pathname));
	if(o.search != "") appendParts(line, "?", o.search.substring(1), c.search.substring(1));
	if(o.hash != "") appendParts(line, "#", o.hash.substring(1), c.hash.substring(1));
	return line;
}

function formatTime(time){
	let date = new Date(time);
	let today = new Date().toDateString() == date.toDateString();
	return today ? date.toLocaleTimeString() : date.toLocaleString();
}

function shownEntries(){
	let filter = document.querySelector("#filter").value.trim().toLowerCase();
	return entries.filter((entry) => filter == "" || entry.url.toLowerCase().includes(filter) || entry.cleaned.toLowerCase().includes(filter));
}

function render(){
	let shown = shownEntries();

	let list = document.querySelector("#log");
	list.replaceChildren();
	for(let entry of shown.slice().reverse()){
		let item = element("li");

		// The type only when it is not the page itself
		let meta = element("div", "meta");
		meta.appendChild(element("span", "time", formatTime(entry.time)));
		if(entry.type != "main_frame") meta.appendChild(element("span", "type", entry.type));
		item.appendChild(meta);

		let url = element("div", "url");
		url.appendChild(renderOriginal(entry.url, entry.cleaned));
		url.appendChild(element("div", "cleaned", entry.cleaned));
		item.appendChild(url);

		// The rules as written in the preferences; older entries don't have them
		let rules = element("div", "rules");
		rules.title = message("log_column_rules");
		for(let rule of entry.rules || []) rules.appendChild(element("code", null, rule));
		item.appendChild(rules);
		list.appendChild(item);
	}

	document.querySelector("#clear").disabled = entries.length == 0;
	document.querySelector("#log").hidden = shown.length == 0;
	let empty = document.querySelector("#empty");
	empty.hidden = shown.length > 0;
	empty.textContent = since != null ? message("log_empty_since", [formatTime(since)]) : message("log_empty");
}

async function load(){
	let result = await browser.storage.session.get([LOG_KEY, LOG_SINCE_KEY]);
	entries = result[LOG_KEY] || [];
	since = result[LOG_SINCE_KEY] || null;
	render();
}

load();

browser.storage.onChanged.addListener((changes, area) => {
	if(area != "session" || !(LOG_KEY in changes || LOG_SINCE_KEY in changes)) return;
	if(LOG_KEY in changes) entries = changes[LOG_KEY].newValue || [];
	if(LOG_SINCE_KEY in changes) since = changes[LOG_SINCE_KEY].newValue || null;
	render();
});

// Chrome only: the declarativeNetRequest rules that src/background/chrome.js made from the preferences
async function getDnrRules(){
	if(!browser.declarativeNetRequest || !browser.declarativeNetRequest.getDynamicRules) return null;
	let rules = await browser.declarativeNetRequest.getDynamicRules();
	return { dynamic: rules.length, regex: rules.filter((rule) => rule.condition.regexFilter != undefined).length };
}

// Everything that helps with a bug report. getPreferences(), getConfig() and defaultParams are in options.js.
async function getTechnicalDetails(){
	let stored = await browser.storage.local.get(["neat_url_enabled", "neat_url_version"]);
	let preferences = await getPreferences();
	return {
		"version": browser.runtime.getManifest().version,
		"browser": await getBrowser(),
		"engine": getEngine(),
		"platform": await browser.runtime.getPlatformInfo(),
		"userAgent": navigator.userAgent,
		"language": browser.i18n.getUILanguage(),
		"pageLanguage": language || null,
		"enabled": stored.neat_url_enabled !== false,
		"hostPermission": await browser.permissions.contains({ origins: ["<all_urls>"] }),
		"preferencesVersion": stored.neat_url_version || null,
		"defaultParams": defaultParams.length,
		"invalidRules": getConfig(preferences).invalid,
		"dnrRules": await getDnrRules(),
		"preferences": preferences
	};
}

// The lists with the user's own rules, which can be left out of the file
const OWN_RULE_LISTS = ["neat_url_blocked_params", "neat_url_override_default_blocked_params", "neat_url_blacklist"];
// Replaces a left out rule in the entries. Not translated: the file is for a bug report on GitHub.
const OWN_RULE = "(own rule)";

// Shows what goes into the file, with a checkbox for the URLs and for each list of own rules
async function openSaveDialog(){
	let preferences = await getPreferences();
	let urls = shownEntries().length;
	let includeUrls = document.querySelector("#include_urls");
	document.querySelector("#include_urls_label").textContent = message("log_save_urls", [String(urls)]);
	includeUrls.disabled = urls == 0;
	includeUrls.checked = urls > 0;

	for(let key of OWN_RULE_LISTS){
		let count = NeatURL.params.parseList(preferences[key]).length;
		let checkbox = document.querySelector("#include_" + key);
		checkbox.disabled = count == 0;
		checkbox.checked = count > 0;
		checkbox.parentNode.querySelector(".count").textContent = `(${count})`;
	}
	// Escape closes the dialog without a new returnValue, so the one of the last save must not stay
	let dialog = document.querySelector("#save_log_dialog");
	dialog.returnValue = "";
	dialog.showModal();
}

// Saves the shown entries (the filter applies) with the rules that cleaned them and the technical details, for a bug report.
// Also possible without entries: the version and the preferences alone help too.
// downloadJson(), getBrowser() and getEngine() are in options.js.
async function saveLog(){
	let details = await getTechnicalDetails();
	let excluded = OWN_RULE_LISTS.filter((key) => !document.querySelector("#include_" + key).checked);
	let hidden = new Set(excluded.flatMap((key) => NeatURL.params.parseList(details.preferences[key])));
	for(let key of excluded) delete details.preferences[key];
	details.invalidRules = details.invalidRules.filter((rule) => !hidden.has(rule));

	let withUrls = document.querySelector("#include_urls").checked;
	let data = Object.assign({ "format": "neat-url-log" }, details, {
		"excluded": excluded.concat(withUrls ? [] : ["entries"]),
		"saved": new Date().toISOString(),
		"since": since != null ? new Date(since).toISOString() : null,
		"filter": document.querySelector("#filter").value.trim(),
		"entries": withUrls ? shownEntries().map((entry) => ({ time: new Date(entry.time).toISOString(), type: entry.type, url: entry.url, cleaned: entry.cleaned,
			rules: (entry.rules || []).map((rule) => hidden.has(rule) ? OWN_RULE : rule) })) : []
	});
	let stamp = data.saved.substring(0, 19).replace(/[T:]/g, "-");
	downloadJson(data, `neat-url-log-${stamp}.json`);
}

function clearLog(){
	if(entries.length > 0 && !confirm(message("log_clear_confirm", [String(entries.length)]))) return;
	browser.storage.session.remove(LOG_KEY);
	browser.storage.session.set({ [LOG_SINCE_KEY]: Date.now() });
}

document.querySelector("#filter").addEventListener("input", render);
document.querySelector("#save_log").addEventListener("click", () => openSaveDialog().catch(console.error));
document.querySelector("#save_log_dialog").addEventListener("close", (event) => {
	if(event.target.returnValue == "save") saveLog().catch(console.error);
});
document.querySelector("#clear").addEventListener("click", clearLog);
