globalThis.browser = globalThis.browser || globalThis.chrome;

const PREFS = NeatURL.defaults.PREFS;
const ALL_URLS = { origins: ["<all_urls>"] };

async function saveOptions() {
	const values = {};
	for(let p in PREFS) {
		values[p] = document.querySelector("#"+p)[PREFS[p].type];
	}

	// The background reloads its state through storage.onChanged
	await browser.storage.local.set(values);
	browser.runtime.sendMessage({action: "notify", data: browser.i18n.getMessage("notify_preferences_saved")}).catch(() => {});
}

async function getPreferences() {
	let result = await browser.storage.local.get(Object.keys(PREFS));
	let values = {};
	for(let p in PREFS) {
		values[p] = p in result ? result[p] : PREFS[p].default;
	}
	return values;
}

async function restoreOptions() {
	// Default blocked parameters
	let response = await fetch('data/default-params-by-category.json');
	let jsonParams = await response.json();
	let categories = jsonParams.categories;
	let lines = categories.map(cat => cat.name + ":\n" + cat.params.join(', '));
	document.getElementById("neat_url_default_blocked_params")["value"] = lines.join("\n\n");

	// Restore preferences
	let values = await getPreferences();
	for(let p in PREFS) {
		document.getElementById(p)[PREFS[p].type] = values[p];
	}

	hideOrShow();
}

function hideOrShow(){
	let checked = document.querySelector("#neat_url_counter_default_color").checked;
	document.querySelector("#counter_color_element").style.display = checked ? "none" : "unset";
}

/// Import and export
async function exportSettings() {
	let data = {
		"format": "neat-url-settings",
		"version": browser.runtime.getManifest().version,
		"preferences": await getPreferences()
	};

	let blob = new Blob([JSON.stringify(data, null, "\t")], { type: "application/json" });
	let link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "neat-url-settings.json";
	link.click();
	setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Only known preferences with the right type are imported
function getImportValues(data) {
	let preferences = data && data.preferences ? data.preferences : data;
	if(preferences == null || typeof preferences != "object") return null;

	let values = {};
	for(let p in PREFS) {
		if(!(p in preferences)) continue;
		let expected = PREFS[p].type == "checked" ? "boolean" : "string";
		if(typeof preferences[p] == expected) values[p] = preferences[p];
	}
	return Object.keys(values).length > 0 ? values : null;
}

async function importSettings(file) {
	let status = document.querySelector("#import_status");
	try{
		let values = getImportValues(JSON.parse(await file.text()));
		if(values == null) throw new Error("no preferences in " + file.name);

		await browser.storage.local.set(values);
		await restoreOptions();
		status.textContent = browser.i18n.getMessage("import_done");
	}catch(error){
		console.error("[Neat URL]: import failed", error);
		status.textContent = browser.i18n.getMessage("import_failed");
	}
}

// Without access to all websites Neat URL can't clean URLs (in Firefox the user can revoke this)
async function checkHostPermission() {
	let banner = document.querySelector(".permissionBanner");
	let granted = await browser.permissions.contains(ALL_URLS);
	banner.style.display = granted ? "none" : "flex";
}

function i18n() {
	for(let element of document.querySelectorAll('[data-i18n]')){
		let id = element.getAttribute("data-i18n");
		let message = browser.i18n.getMessage(id);
		if(message == ""){
			console.error("i18n id " + id + " not found");
			continue;
		}

		if(message.includes("<") && message.includes(">")){
			// Messages can contain links, parse them instead of assigning innerHTML
			let parsed = new DOMParser().parseFromString(message, "text/html");
			element.replaceChildren(...parsed.body.childNodes);
		}else{
			element.textContent = message;
		}
	}
}

function useCorrectStylesheet(){
	let userAgent = navigator.userAgent;
	let b = userAgent.includes("Firefox") ? "firefox" : "chrome";

	let styles = document.createElement('link');
	styles.rel = "stylesheet";
	styles.type = "text/css";
	styles.media = "screen";
	styles.href = "css/options." + b + ".css";
	document.getElementsByTagName('head')[0].appendChild(styles);
}

function init(){
	useCorrectStylesheet();
	restoreOptions().catch(console.error);
	i18n();
	checkHostPermission();
	document.querySelector("form").style.display = "block";
	document.querySelector(".refreshOptions").style.display = "none";
}

window.addEventListener("DOMContentLoaded", init, { passive: true });
document.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); saveOptions(); }, { passive: false });
document.querySelector("#neat_url_counter_default_color").addEventListener("change", hideOrShow);
document.querySelector("#grant_host_permission").addEventListener("click", () => {
	// Must be called directly from the click handler
	browser.permissions.request(ALL_URLS).then(checkHostPermission);
});
document.querySelector("#export_settings").addEventListener("click", () => exportSettings().catch(console.error));
document.querySelector("#import_settings").addEventListener("click", () => document.querySelector("#import_file").click());
document.querySelector("#import_file").addEventListener("change", (e) => {
	if(e.target.files.length > 0) importSettings(e.target.files[0]);
	e.target.value = "";
});
