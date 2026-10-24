globalThis.browser = globalThis.browser || globalThis.chrome;

const PREFS = NeatURL.defaults.PREFS;
const ALL_URLS = { origins: ["<all_urls>"] };
const LINKUMORI_NOTICE_KEY = "neat_url_linkumori_notice";

// Request types per browser (see FIREFOX_RESOURCE_TYPES and CHROME_RESOURCE_TYPES in src/core/dnr.js)
const COMMON_TYPES = ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"];
const FIREFOX_TYPES = ["beacon", "imageset", "object_subrequest", "speculative", "web_manifest", "xml_dtd", "xslt"];
const CHROME_TYPES = ["webtransport", "webbundle"];

let savedValues = null; // the preferences as they are in storage
let categories = []; // data/default-params-by-category.json
let defaultParams = [];
let suffixSet = new Set();
let paramCheckboxes = new Map(); // parameter -> its checkboxes in the list of default parameters

/// Language of the options page. browser.i18n always uses the language of the browser,
/// so for another language the page reads _locales/<language>/messages.json itself.
const LANGUAGE_KEY = "neat_url_language"; // "" is the language of the browser
// The folders in _locales, with the name of the language in that language (test/locales.test.js checks this list)
const LANGUAGES = { "de": "Deutsch", "en": "English", "es": "Español", "fr": "Français", "id": "Bahasa Indonesia", "it": "Italiano", "ja": "日本語", "ko": "한국어", "nl": "Nederlands", "pl": "Polski", "pt_BR": "Português (Brasil)", "ru": "Русский", "tr": "Türkçe", "uk": "Українська", "zh_CN": "简体中文", "zh_TW": "繁體中文" };
let language = "";
let languageMessages = null; // the messages of the chosen language, null for the language of the browser

async function loadLanguage(){
	let result = await browser.storage.local.get(LANGUAGE_KEY);
	language = result[LANGUAGE_KEY] in LANGUAGES ? result[LANGUAGE_KEY] : "";
	languageMessages = null;
	if(language != ""){
		let response = await fetch("_locales/" + language + "/messages.json");
		languageMessages = await response.json();
	}
	document.documentElement.lang = (language || browser.i18n.getUILanguage()).replace("_", "-");
}

// Fills in the placeholders the way browser.i18n does: $NAME$ is the content of the placeholder, $1 the first substitution
function formatMessage(entry, substitutions){
	let values = [].concat(substitutions == undefined ? [] : substitutions);
	let placeholders = entry.placeholders || {};
	let text = entry.message.replace(/\$([a-z0-9_@]+)\$/gi, (match, name) => {
		let key = Object.keys(placeholders).find((key) => key.toLowerCase() == name.toLowerCase());
		return key ? placeholders[key].content : match;
	});
	return text.replace(/\$(\d)/g, (match, n) => values[n - 1] != undefined ? String(values[n - 1]) : "").replace(/\$\$/g, "$");
}

function message(id, substitutions){
	if(languageMessages && languageMessages[id]) return formatMessage(languageMessages[id], substitutions);
	return browser.i18n.getMessage(id, substitutions);
}

function renderLanguagePicker(){
	let select = document.querySelector("#language");
	select.replaceChildren();
	select.setAttribute("aria-label", message("language"));
	select.title = message("language");
	let browserOption = element("option", null, message("language_browser"));
	browserOption.value = "";
	select.appendChild(browserOption);
	for(let code in LANGUAGES){
		let option = element("option", null, LANGUAGES[code]);
		option.value = code;
		option.lang = code.replace("_", "-");
		select.appendChild(option);
	}
	select.value = language;
}

// Translates everything on the page again, without a reload, so changes that are not saved stay
async function changeLanguage(code){
	await browser.storage.local.set({ [LANGUAGE_KEY]: code });
	await loadLanguage();
	translatePage();
	if(savedValues != null) formChanged();
	render(); // the Log tab, in log.js
}

function translatePage(){
	i18n();
	renderLanguagePicker();
	renderAbout();
	showView();
}

function element(tag, className, text){
	let node = document.createElement(tag);
	if(className) node.className = className;
	if(text != undefined) node.textContent = text;
	return node;
}

function control(p){
	return document.getElementById(p);
}

/// Values of the form
function getFormValues(){
	let values = {};
	for(let p in PREFS) values[p] = control(p)[PREFS[p].type];
	return values;
}

function setFormValues(values){
	for(let p in PREFS) control(p)[PREFS[p].type] = values[p];
	formChanged();
}

function isDirty(){
	if(savedValues == null) return false;
	let values = getFormValues();
	return Object.keys(PREFS).some((p) => values[p] !== savedValues[p]);
}

async function getPreferences(){
	let result = await browser.storage.local.get(Object.keys(PREFS));
	let values = {};
	for(let p in PREFS){
		values[p] = p in result ? result[p] : PREFS[p].default;
	}
	return values;
}

// Everything that depends on the values of the form
function formChanged(){
	updateDefaultParams();
	renderRequestTypes();
	updateCounterOptions();
	for(let textarea of document.querySelectorAll("textarea[data-check]")) checkList(textarea);
	testUrl();
	updateSaveBar();
}

/// Save bar
function updateSaveBar(text){
	let dirty = isDirty();
	let status = document.querySelector("#save_status");
	if(text != undefined) status.textContent = text;
	else if(dirty) status.textContent = message("unsaved_changes");
	else if(status.textContent == message("unsaved_changes")) status.textContent = "";
	document.querySelector(".savebar").classList.toggle("dirty", dirty);
	document.querySelector("button.save").disabled = !dirty;
	document.querySelector("#revert_changes").disabled = !dirty;
}

async function saveOptions(){
	if(!isDirty()) return;
	let values = getFormValues();

	// The background reloads its state through storage.onChanged
	await browser.storage.local.set(values);
	savedValues = values;
	updateSaveBar(message("notify_preferences_saved"));
}

async function restoreOptions(){
	let [paramsResponse, suffixResponse] = await Promise.all([fetch("data/default-params-by-category.json"), fetch("data/publicsuffix-ccSLD.txt")]);
	categories = (await paramsResponse.json()).categories;
	defaultParams = Array.from(new Set(categories.flatMap((category) => category.params)));
	suffixSet = new Set((await suffixResponse.text()).split(/\r?\n/).map((line) => line.trim()).filter((line) => line != ""));
	renderDefaultParams();

	savedValues = await getPreferences();
	setFormValues(savedValues);
	animateLogo(savedValues.neat_url_icon_animation);
}

/// The logo plays the icon animation of the preferences once when the page opens (see animateToolbarIcon() in src/background/common.js)
const LOGO_FRAMES = {
	missing_underscore: ["neaturl-96-state-1.png", "neaturl-96-state0.png", "neaturl-96-state-1.png"],
	rotate: ["neaturl-96-state1.png", "neaturl-96-state2.png", "neaturl-96-state3.png"]
};

function animateLogo(animation){
	if(animation == "surprise_me") animation = Math.random() < 0.5 ? "missing_underscore" : "rotate";
	let frames = LOGO_FRAMES[animation];
	if(!frames || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	let img = document.querySelector("nav.views .title img");
	let source = document.querySelector("nav.views .title source");
	let original = [img.getAttribute("src"), source.getAttribute("srcset")];
	let show = (dark, light) => { img.src = dark; source.srcset = light; };
	frames.concat(null).forEach((frame, index) => setTimeout(() => {
		if(frame == null) show(...original);
		else show("icons/dark/" + frame, "icons/light/" + frame);
	}, 300 + index * 350));
}

/// Default blocked parameters: a list per category, unchecking a parameter adds it to the override list.
/// The override list itself is a hidden field: the checkboxes show the same.
function getOverrides(){
	return NeatURL.params.parseList(control("neat_url_override_default_blocked_params").value);
}

function setParamEnabled(params, enabled){
	let overrides = getOverrides().filter((param) => !params.includes(param));
	if(!enabled) overrides = overrides.concat(params);
	control("neat_url_override_default_blocked_params").value = overrides.join(", ");
	formChanged();
}

function renderDefaultParams(){
	let container = document.querySelector("#default_params");
	container.replaceChildren();
	paramCheckboxes.clear();

	for(let category of categories){
		let details = element("details", "category");
		details.dataset.name = category.name.toLowerCase();
		let summary = element("summary");
		let all = element("input");
		all.type = "checkbox";
		all.className = "category-toggle";
		all.setAttribute("aria-label", category.name);
		all.addEventListener("click", (e) => e.stopPropagation()); // don't open or close the category
		all.addEventListener("change", () => setParamEnabled(category.params, all.checked));
		summary.append(all, element("span", "category-name", category.name), element("span", "category-count descr"));
		details.appendChild(summary);

		let list = element("div", "category-params");
		for(let param of category.params){
			let label = element("label", "param");
			label.dataset.param = param.toLowerCase();
			let checkbox = element("input");
			checkbox.type = "checkbox";
			checkbox.addEventListener("change", () => setParamEnabled([param], checkbox.checked));
			label.append(checkbox, element("code", null, param));
			list.appendChild(label);
			if(!paramCheckboxes.has(param)) paramCheckboxes.set(param, []);
			paramCheckboxes.get(param).push(checkbox);
		}
		details.appendChild(list);
		container.appendChild(details);
	}
	filterDefaultParams();
}

function updateDefaultParams(){
	let overrides = new Set(getOverrides());
	for(let [param, checkboxes] of paramCheckboxes){
		for(let checkbox of checkboxes) checkbox.checked = !overrides.has(param);
	}

	for(let details of document.querySelectorAll("#default_params details")){
		let boxes = Array.from(details.querySelectorAll(".category-params input"));
		let on = boxes.filter((box) => box.checked).length;
		let all = details.querySelector(".category-toggle");
		all.checked = on == boxes.length;
		all.indeterminate = on > 0 && on < boxes.length;
		details.querySelector(".category-count").textContent = on + "/" + boxes.length;
	}

	let on = defaultParams.filter((param) => !overrides.has(param)).length;
	document.querySelector("#default_params_count").textContent = message("default_params_count", [String(on), String(defaultParams.length)]);
}

// A search shows the categories and parameters that match, and opens the categories
function filterDefaultParams(){
	let search = document.querySelector("#default_params_search").value.trim().toLowerCase();
	for(let details of document.querySelectorAll("#default_params details")){
		let categoryMatches = details.dataset.name.includes(search);
		let any = false;
		for(let label of details.querySelectorAll(".param")){
			let show = search == "" || categoryMatches || label.dataset.param.includes(search);
			label.hidden = !show;
			any = any || show;
		}
		details.hidden = !any;
		details.open = search != "" && any;
	}
}

/// Checks of the lists: number of items, invalid items and duplicates
const LOOKS_LIKE_DOMAIN = /^(?:\*\.)?(?:[a-z0-9-]+\.)+(?:[a-z]{2,}|\*)$/i;

function duplicates(items){
	return Array.from(new Set(items.filter((item, index) => items.indexOf(item) != index)));
}

function checkList(textarea){
	let items = NeatURL.params.parseList(textarea.value);
	let warnings = [];
	let add = (id, list) => { if(list.length > 0) warnings.push(message(id, [list.join(", ")])); };

	switch(textarea.dataset.check){
		case "params": {
			let overrides = getOverrides();
			add("list_invalid", items.filter((item) => NeatURL.params.parseEntry(item) == null));
			add("list_already_default", items.filter((item) => defaultParams.includes(item) && !overrides.includes(item)));
			// "google.com" is a valid parameter name, but most likely a domain without a parameter
			add("list_looks_like_domain", items.filter((item) => LOOKS_LIKE_DOMAIN.test(item)));
			break;
		}
		case "domains":
			add("list_invalid", items.filter((item) => NeatURL.domain.parsePattern(item.replace(/^\./, "")) == null));
			break;
	}
	add("list_duplicates", duplicates(items));

	let status = document.querySelector(`.list-status[data-for="${textarea.id}"]`);
	status.replaceChildren(element("div", null, message("list_count", [String(items.length)]) + " · " + message("list_hint")));
	for(let warning of warnings) status.appendChild(element("div", "warning", warning));
	textarea.classList.toggle("has-warning", warnings.length > 0);
}

/// Test a URL with the preferences in the form, also when they are not saved yet
function getConfig(values){
	return NeatURL.params.compileConfig({
		defaultParams: defaultParams,
		overrides: values.neat_url_override_default_blocked_params,
		blockedParams: values.neat_url_blocked_params,
		blacklist: values.neat_url_blacklist,
		cleanNested: values.neat_url_clean_nested,
		keepSigned: values.neat_url_keep_signed_urls,
		suffixSet: suffixSet
	});
}

function showTestUrl(url){
	let field = document.querySelector("#test_url");
	field.value = url;
	testUrl();
	field.focus();
}

// "example.com/?utm_source=x" is tested as https://example.com/?utm_source=x
function parseTestUrl(text){
	let href = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : "https://" + text;
	try{
		new URL(href);
		return href;
	}catch(ex){
		return null;
	}
}

// Why a URL is not changed
function unchangedReason(href, config){
	let url = new URL(href);
	if(url.protocol != "http:" && url.protocol != "https:") return "test_url_not_web";
	if(NeatURL.domain.isBlacklisted(NeatURL.domain.splitHost(url.hostname, config.suffixSet), config.blacklist)) return "test_url_blacklisted";
	let signed = Array.from(url.searchParams.keys()).some(NeatURL.clean.isSignatureKey);
	if(config.keepSigned && signed) return "test_url_signed";
	return "test_url_unchanged";
}

function testUrl(){
	let result = document.querySelector("#test_result");
	let text = document.querySelector("#test_url").value.trim();
	result.replaceChildren();
	if(text == "" || savedValues == null) return;

	let href = parseTestUrl(text);
	if(href == null){
		result.appendChild(element("div", "warning", message("test_url_invalid")));
		return;
	}

	let config = getConfig(getFormValues());
	let applied = new Set();
	let cleaned = NeatURL.clean.cleanUrl(href, config, { applied });
	if(cleaned == href){
		let reason = unchangedReason(href, config);
		result.appendChild(element("div", "descr", message(reason)));
		if(reason == "test_url_unchanged") result.appendChild(renderSuggestions(cleaned, config));
		return;
	}

	// renderOriginal() is in log.js
	result.appendChild(renderOriginal(href, cleaned));
	result.appendChild(element("div", "cleaned", cleaned));
	result.appendChild(element("div", "rules descr", message("log_column_rules") + ": " + Array.from(applied).join(", ")));
	result.appendChild(renderSuggestions(cleaned, config));
}

// A rule can't contain whitespace, a comma or an @ (the @ starts the domain)
const RULE_UNSAFE = /[\s,@]/;
// A long value is usually an id or a token that is different every time, a rule for it doesn't help
const MAX_SUGGESTED_VALUE = 40;

// The parameters that are left, that can be written as a rule as they are: [{ name, value }].
// value is only set when name=value can be a rule.
function remainingParams(href){
	let result = [];
	for(let [name, value] of new URL(href).searchParams){
		if(name == "" || RULE_UNSAFE.test(name) || result.some((param) => param.name == name)) continue;
		let entry = NeatURL.params.parseEntry(name);
		if(entry == null || entry.kind != "query" || entry.name != name || !NeatURL.params.isExactName(entry)) continue;

		let valueEntry = NeatURL.params.parseEntry(name + "=" + value);
		let valueOk = value != "" && value.length <= MAX_SUGGESTED_VALUE && !RULE_UNSAFE.test(value) && valueEntry != null && valueEntry.value == value;
		result.push({ name: name, value: valueOk ? value : undefined });
	}
	return result;
}

function addBlockedParam(rule){
	let textarea = control("neat_url_blocked_params");
	let value = textarea.value.replace(/\s+$/, "");
	// Keep the style of the list: one rule per line, or separated by commas
	let separator = value.includes("\n") && !value.includes(",") ? "\n" : ", ";
	textarea.value = value == "" ? rule : value + separator + rule;
	formChanged();
}

// Which parameter do you want to remove? A rule for all websites, for this domain only,
// or for this domain only when the parameter has this value.
function renderSuggestions(href, config){
	let container = element("div", "suggestions");
	let params = remainingParams(href);
	if(params.length == 0) return container;

	let host = NeatURL.domain.splitHost(new URL(href).hostname, config.suffixSet).host;
	container.appendChild(element("div", "descr", message("test_url_suggestions")));
	for(let { name, value } of params){
		let row = element("div", "suggestion");
		row.appendChild(element("code", null, value != undefined ? name + "=" + value : name));
		let rules = [[name, message("test_url_rule_global", [name])], [name + "@" + host, message("test_url_rule_domain", [name + "@" + host, host])]];
		if(value != undefined){
			let rule = name + "=" + value + "@" + host;
			rules.push([rule, message("test_url_rule_value", [rule, host])]);
		}
		let buttons = element("div", "suggestion-rules");
		for(let [rule, text] of rules){
			let button = element("button", null, text);
			button.type = "button";
			button.addEventListener("click", () => addBlockedParam(rule));
			buttons.appendChild(button);
		}
		row.appendChild(buttons);
		container.appendChild(row);
	}
	return container;
}

/// Request types: checkboxes for the types of this browser, stored as a comma-separated list
function renderRequestTypes(){
	let selected = NeatURL.params.parseList(control("neat_url_types").value);
	let types = COMMON_TYPES.concat(browser.runtime.getBrowserInfo ? FIREFOX_TYPES : CHROME_TYPES);
	// Keep types that are stored but unknown here, so they can be unchecked
	types = types.concat(selected.filter((type) => !types.includes(type)));

	let container = document.querySelector("#request_types");
	container.replaceChildren();
	for(let type of types){
		let label = element("label");
		let checkbox = element("input");
		checkbox.type = "checkbox";
		checkbox.value = type;
		checkbox.checked = selected.includes(type);
		checkbox.addEventListener("change", () => {
			let checked = Array.from(container.querySelectorAll("input:checked"), (box) => box.value);
			control("neat_url_types").value = checked.join(",");
			formChanged();
		});
		label.append(checkbox, element("code", null, type));
		container.appendChild(label);
	}

	let status = document.querySelector("#request_types_status");
	status.replaceChildren();
	if(selected.length == 0) status.appendChild(element("div", "warning", message("request_types_none")));
}

/// Counter: the color only matters when the counter is shown
function updateCounterOptions(){
	let shown = control("neat_url_show_counter").checked;
	let defaultColor = control("neat_url_counter_default_color").checked;
	document.querySelector("#counter_color_option").classList.toggle("disabled", !shown);
	control("neat_url_counter_default_color").disabled = !shown;
	control("neat_url_counter_color").disabled = !shown;
	document.querySelector("#counter_color_element").hidden = defaultColor;
}

/// Import and export
async function exportSettings(){
	let data = {
		"format": "neat-url-settings",
		"version": browser.runtime.getManifest().version,
		"preferences": await getPreferences()
	};

	downloadJson(data, "neat-url-settings.json");
}

function downloadJson(data, fileName){
	let blob = new Blob([JSON.stringify(data, null, "\t")], { type: "application/json" });
	let link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = fileName;
	link.click();
	setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Only known preferences with the right type are imported
function getImportValues(data){
	let preferences = data && data.preferences ? data.preferences : data;
	if(preferences == null || typeof preferences != "object") return null;

	let values = {};
	for(let p in PREFS){
		if(!(p in preferences)) continue;
		let expected = PREFS[p].type == "checked" ? "boolean" : "string";
		if(typeof preferences[p] == expected) values[p] = preferences[p];
	}
	return Object.keys(values).length > 0 ? values : null;
}

async function importSettings(file){
	let status = document.querySelector("#import_status");
	let values;
	try{
		values = getImportValues(JSON.parse(await file.text()));
		if(values == null) throw new Error("no preferences in " + file.name);
	}catch(error){
		console.error("[Neat URL]: import failed", error);
		status.textContent = message("import_failed");
		return;
	}

	if(!confirm(message("import_confirm", [String(Object.keys(values).length), file.name]))) return;
	await browser.storage.local.set(values);
	savedValues = await getPreferences();
	setFormValues(savedValues);
	status.textContent = message("import_done");
}

// Without access to all websites Neat URL can't clean URLs (in Firefox the user can revoke this)
async function checkHostPermission(){
	let granted = await browser.permissions.contains(ALL_URLS);
	document.querySelector(".permissionBanner").hidden = granted;
}

// Shown once after the update from Linkumori, until it is dismissed
async function checkLinkumoriNotice(){
	let stored = await browser.storage.local.get(LINKUMORI_NOTICE_KEY);
	document.querySelector(".noticeBanner").hidden = stored[LINKUMORI_NOTICE_KEY] !== true;
}

/// Version, browser and the engine that cleans URLs (see docs/browser-support.md)
async function getBrowser(){
	// Firefox
	if(browser.runtime.getBrowserInfo){
		let info = await browser.runtime.getBrowserInfo();
		return info.name + " " + info.version;
	}

	// Chromium-based browsers: prefer the brand of the browser itself (Microsoft Edge, Opera, ...) over Chromium
	let data = navigator.userAgentData;
	if(!data) return "Chromium";
	let brands = data.brands;
	try{
		brands = (await data.getHighEntropyValues(["fullVersionList"])).fullVersionList || brands;
	}catch(error){}
	brands = brands.filter((brand) => !/not.a.brand/i.test(brand.brand));
	let brand = brands.find((brand) => brand.brand != "Chromium") || brands[0];
	return brand ? brand.brand + " " + brand.version : "Chromium";
}

function getEngine(){
	return browser.runtime.getBrowserInfo ? "webRequest (blocking)" : "declarativeNetRequest";
}

let browserName = null;

async function showAbout(){
	document.querySelector("nav.views .title").append(" " + browser.runtime.getManifest().version);
	browserName = await getBrowser();
	renderAbout();
}

function renderAbout(){
	if(browserName != null) document.querySelector("#about").textContent = message("about", [browserName, getEngine()]);
}

function i18n(){
	for(let element of document.querySelectorAll('[data-i18n]')){
		let id = element.getAttribute("data-i18n");
		let text = message(id);
		if(text == ""){
			console.error("i18n id " + id + " not found");
			continue;
		}

		if(text.includes("<") && text.includes(">")){
			// Messages can contain links, parse them instead of assigning innerHTML
			let parsed = new DOMParser().parseFromString(text, "text/html");
			element.replaceChildren(...parsed.body.childNodes);
		}else{
			element.textContent = text;
		}
	}
	for(let element of document.querySelectorAll('[data-i18n-placeholder]')){
		let text = message(element.getAttribute("data-i18n-placeholder"));
		if(text != "") element.placeholder = text;
	}
}

/// Views: #preferences (default), #appearance, #advanced and #log. The first three are parts of the form.
function showView(){
	let links = Array.from(document.querySelectorAll("nav.views a[data-view]"));
	let link = links.find((link) => "#" + link.getAttribute("data-view") == location.hash) || links[0];
	let view = link.getAttribute("data-view");
	for(let element of document.querySelectorAll(".view")){
		element.hidden = element.getAttribute("data-view") != view;
	}
	document.querySelector("#optionsform").hidden = view == "log";
	for(let other of links){
		other.classList.toggle("active", other == link);
		if(other == link) other.setAttribute("aria-current", "page");
		else other.removeAttribute("aria-current");
	}
	document.title = "Neat URL - " + link.textContent;
}

// When the page opens or another tab is chosen: Test a URL on Preferences, the filter on Log.
// Not in showView(), which also runs when the language changes.
function focusView(){
	let field = { "#preferences": "#test_url", "": "#test_url", "#log": "#filter" }[location.hash];
	if(field) document.querySelector(field).focus();
}

async function init(){
	try{
		await loadLanguage();
	}catch(error){
		console.error("[Neat URL]: could not load the language", error);
	}
	translatePage();
	focusView();
	// The toolbar button opens options.html?test=<URL of the tab>#preferences
	let test = new URLSearchParams(location.search).get("test");
	if(test){
		showTestUrl(test);
		history.replaceState(null, "", location.pathname + location.hash);
	}
	restoreOptions().catch(console.error);
	checkHostPermission();
	checkLinkumoriNotice().catch(console.error);
	showAbout().catch(console.error);
	render(); // the Log tab may have been rendered before the language was loaded
	document.querySelector(".refreshOptions").hidden = true;
}

let testTimer = null;

window.addEventListener("DOMContentLoaded", () => init().catch(console.error), { passive: true });
window.addEventListener("hashchange", () => {
	showView();
	focusView();
});
window.addEventListener("beforeunload", (e) => {
	if(!isDirty()) return;
	e.preventDefault();
	e.returnValue = "";
});
window.addEventListener("keydown", (e) => {
	if((e.ctrlKey || e.metaKey) && e.key == "s" && !document.querySelector("#optionsform").hidden){
		e.preventDefault();
		saveOptions().catch(console.error);
	}
});

let form = document.querySelector("#optionsform");
form.addEventListener("submit", (e) => { e.preventDefault(); saveOptions().catch(console.error); }, { passive: false });
for(let p in PREFS){
	control(p).addEventListener(PREFS[p].type == "checked" ? "change" : "input", formChanged);
}

// Another tab or an import changed the preferences: show them, unless there are changes that are not saved
browser.storage.onChanged.addListener(async (changes, area) => {
	if(area != "local" || savedValues == null || !Object.keys(changes).some((key) => key in PREFS)) return;
	let dirty = isDirty();
	savedValues = await getPreferences();
	if(!dirty) setFormValues(savedValues);
	else updateSaveBar();
});

document.querySelector("#revert_changes").addEventListener("click", () => {
	setFormValues(savedValues);
	updateSaveBar("");
});
document.querySelector("#restore_defaults").addEventListener("click", () => setFormValues(NeatURL.defaults.getDefaultPrefs()));
document.querySelector("#default_params_search").addEventListener("input", filterDefaultParams);
document.querySelector("#test_url").addEventListener("input", () => {
	clearTimeout(testTimer);
	testTimer = setTimeout(testUrl, 150);
});
document.querySelector("#grant_host_permission").addEventListener("click", () => {
	// Must be called directly from the click handler
	browser.permissions.request(ALL_URLS).then(checkHostPermission);
});
document.querySelector("#dismiss_linkumori_notice").addEventListener("click", () => {
	document.querySelector(".noticeBanner").hidden = true;
	browser.storage.local.remove(LINKUMORI_NOTICE_KEY);
});
document.querySelector("#export_settings").addEventListener("click", () => exportSettings().catch(console.error));
document.querySelector("#import_settings").addEventListener("click", () => document.querySelector("#import_file").click());
document.querySelector("#import_file").addEventListener("change", (e) => {
	if(e.target.files.length > 0) importSettings(e.target.files[0]).catch(console.error);
	e.target.value = "";
});
document.querySelector("#language").addEventListener("change", (e) => changeLanguage(e.target.value).catch(console.error));
// The toolbar button or its menu was used while this page is open (openOptionsTab() in src/background/common.js)
browser.runtime.onMessage.addListener((request) => {
	if(request.action != "show-options") return;
	location.hash = "#" + request.view;
	if(request.testUrl) showTestUrl(request.testUrl);
});
// The language was chosen in another tab
browser.storage.onChanged.addListener((changes, area) => {
	if(area != "local" || !(LANGUAGE_KEY in changes) || (changes[LANGUAGE_KEY].newValue || "") == language) return;
	loadLanguage().then(() => {
		translatePage();
		if(savedValues != null) formChanged();
		render();
	}).catch(console.error);
});
