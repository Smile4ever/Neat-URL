// Migration of stored preferences between versions. Pure function: returns the changes to store.
(function(root){
	"use strict";
	const NeatURL = root.NeatURL = root.NeatURL || {};
	const params = NeatURL.params || require("./params.js");
	const defaults = NeatURL.defaults || require("./defaults.js");
	const domain = NeatURL.domain || require("./domain.js");

	function compareVersions(a, b){
		let pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
		let pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
		for(let i = 0; i < Math.max(pa.length, pb.length); i++){
			let diff = (pa[i] || 0) - (pb[i] || 0);
			if(diff != 0) return diff < 0 ? -1 : 1;
		}
		return 0;
	}

	// Removes items from a comma separated list that may have several lines, header lines ("Name:") and labels ("Name: a, b")
	function removeFromListText(text, shouldRemove){
		let changed = false;
		let lines = String(text).split(/\r?\n/).map((line) => {
			let { label, rules } = params.splitLabel(line);
			let items = rules.split(",").map((item) => item.trim()).filter((item) => item != "");
			let kept = items.filter((item) => !shouldRemove(item.replace(/\s+/g, "")));
			if(kept.length == items.length) return line;
			changed = true;
			return label + kept.join(", ");
		});
		return changed ? lines.join("\n") : text;
	}

	// Linkumori was published as an update of Neat URL in the Chrome Web Store (same extension ID), so its data
	// is still in storage.local when Neat URL 2026.10.24 replaces it. PurifyUrlsSettings only exists when Linkumori was installed.
	const LINKUMORI_KEYS = ["PurifyUrlsSettings", "customRules", "whitelist", "stats", "theme", "firstInstalled",
		"historyApiProtection", "blockHyperlinkAuditing", "updateBadgeOnOff", "PreventGoogleandyandexscript",
		"exceptionRules", "exceptionDisabledRules", "disabledExceptionRules", "LinkumoriEngineStart", "updateHyperlinkAuditing"];
	// A parameter name without the characters that have a meaning in Neat URL rules
	const PLAIN_PARAM = /^[^\s,@!$#*={}]+$/;

	// Adds items to a list on a new line, skipping items that are already in the list
	function appendItems(text, items, skip){
		let existing = params.parseList(text);
		let added = items.filter((item, index) => !existing.includes(item) && !skip(item) && items.indexOf(item) == index);
		if(added.length == 0) return text;
		let before = text == undefined || String(text).trim() == "" ? "" : String(text).replace(/\s+$/, "") + "\n";
		return before + added.join(", ");
	}

	// Linkumori rules ({ domain, param } or { domain, params }) and whitelisted domains apply to the domain and its
	// subdomains (declarativeNetRequest requestDomains), which is *.domain in a parameter rule and a plain domain in the blacklist.
	// blockedParams and blacklist are the current values. Returns { changes, remove }.
	function importLinkumori(stored, blockedParams, blacklist, defaultParams){
		if(stored.PurifyUrlsSettings == undefined) return { changes: {}, remove: [] };

		let changes = {};
		let isDomain = (value) => typeof value == "string" && domain.parsePattern("*." + value) != null;

		let rules = [];
		for(let rule of Array.isArray(stored.customRules) ? stored.customRules : []){
			if(rule == null || !isDomain(rule.domain)) continue;
			let names = Array.isArray(rule.params) ? rule.params : [rule.param];
			for(let name of names){
				if(typeof name == "string" && PLAIN_PARAM.test(name)) rules.push(name + "@*." + rule.domain.trim().toLowerCase());
			}
		}
		let newBlocked = appendItems(blockedParams, rules, (rule) => defaultParams.includes(rule));
		if(newBlocked != blockedParams) changes.neat_url_blocked_params = newBlocked;

		let domains = (Array.isArray(stored.whitelist) ? stored.whitelist : []).filter(isDomain).map((d) => d.trim().toLowerCase());
		let newBlacklist = appendItems(blacklist, domains, () => false);
		if(newBlacklist != blacklist) changes.neat_url_blacklist = newBlacklist;

		return { changes: changes, remove: LINKUMORI_KEYS.filter((key) => stored[key] !== undefined) };
	}

	// stored: the values from storage.local
	// defaultParams: the current default blocked parameters (data/default-params-by-category.json)
	// Returns { changes: {...}, remove: [...] } - changes is empty if nothing needs to be stored, remove has the keys to remove
	function migrate(stored, currentVersion, defaultParams){
		let result = migrateVersion(stored, currentVersion, defaultParams);
		let current = (key) => result.changes[key] !== undefined ? result.changes[key] : stored[key];
		let linkumori = importLinkumori(stored, current("neat_url_blocked_params"), current("neat_url_blacklist"), defaultParams);
		return { changes: Object.assign(result.changes, linkumori.changes), remove: linkumori.remove };
	}

	function migrateVersion(stored, currentVersion, defaultParams){
		let changes = {};
		let previousVersion = stored.neat_url_version;

		if(previousVersion != undefined && compareVersions(previousVersion, currentVersion) >= 0){
			return { changes: changes };
		}

		let hasBlockedParams = stored.neat_url_blocked_params != undefined;
		let blocked = params.parseList(stored.neat_url_blocked_params);
		let overrides = params.parseList(stored.neat_url_override_default_blocked_params);
		let newBlocked = blocked;
		let newOverrides = overrides;

		let isFromVersion4 = previousVersion != undefined && compareVersions(previousVersion, "5.0.0") < 0;

		if(isFromVersion4 && hasBlockedParams){
			let oldDefaults = defaults.VERSION_4_DEFAULT_PARAMS;
			let compiled = params.compileConfig({ defaultParams: defaultParams });

			// In 4.x the defaults were part of the user's list, and the defaults that the user removed were kept
			// in neat_url_hidden_params. These must stay disabled.
			let removedDefaults = stored.neat_url_hidden_params != undefined
				? params.parseList(stored.neat_url_hidden_params)
				: oldDefaults.filter((param) => !blocked.includes(param));

			for(let removed of removedDefaults){
				if(defaultParams.includes(removed)){
					if(!newOverrides.includes(removed)) newOverrides = newOverrides.concat(removed);
					continue;
				}

				// Still covered by a 5.0 wildcard (utm_source by utm_*): exclude it explicitly
				let entry = params.parseEntry(removed);
				let coveredByWildcard = entry != null && entry.kind == "query" && compiled.entries.some((e) =>
					e.kind == "query" && e.prefix && params.entryMatchesKey(e, entry.name) && NeatURL.domain.patternKey(e.pattern) == NeatURL.domain.patternKey(entry.pattern));
				if(coveredByWildcard && !newBlocked.includes("!" + removed)) newBlocked = newBlocked.concat("!" + removed);
			}

			// Old defaults are no longer part of the user's own list
			newBlocked = newBlocked.filter((param) => !oldDefaults.includes(param)).filter((param) => !defaultParams.includes(param));
			if(newBlocked.join(",") != blocked.join(",")) changes.neat_url_blocked_params = newBlocked.join(", ");
		}else if(hasBlockedParams){
			// Exact duplicates of default parameters are removed from the user's list, keeping its lines and headers
			let text = removeFromListText(stored.neat_url_blocked_params, (param) => defaultParams.includes(param));
			if(text != stored.neat_url_blocked_params) changes.neat_url_blocked_params = text;
		}
		if(newOverrides.join(",") != overrides.join(",")){
			changes.neat_url_override_default_blocked_params = newOverrides.join(", ");
		}

		// Very old releases used #eeeeee as the counter color without a "default color" setting
		if(stored.neat_url_counter_default_color == undefined && stored.neat_url_counter_color == "#eeeeee"){
			changes.neat_url_counter_default_color = true;
		}

		// 2026.10.24 has no notifications anymore, so the themes "dark/light icons except for notifications" are just dark or light
		if(stored.neat_url_icon_theme == "dark_notiflight") changes.neat_url_icon_theme = "dark";
		if(stored.neat_url_icon_theme == "light_notifdark") changes.neat_url_icon_theme = "light";
		// 2026.10.24.2 follows the browser theme by default (#252). Dark was the default before and saving stores every field,
		// so dark is set to auto once: auto still uses dark icons on a light theme.
		let iconTheme = changes.neat_url_icon_theme || stored.neat_url_icon_theme;
		if(iconTheme == "dark" && (previousVersion == undefined || compareVersions(previousVersion, "2026.10.24.2") < 0)){
			changes.neat_url_icon_theme = "auto";
		}

		changes.neat_url_version = currentVersion;
		return { changes: changes };
	}

	NeatURL.migrate = { migrate, compareVersions, LINKUMORI_KEYS };
	if(typeof module === "object" && module.exports) module.exports = NeatURL.migrate;
})(globalThis);
