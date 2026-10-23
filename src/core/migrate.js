// Migration of stored preferences between versions. Pure function: returns the changes to store.
(function(root){
	"use strict";
	const NeatURL = root.NeatURL = root.NeatURL || {};
	const params = NeatURL.params || require("./params.js");
	const defaults = NeatURL.defaults || require("./defaults.js");

	function compareVersions(a, b){
		let pa = String(a).split(".").map((n) => parseInt(n, 10) || 0);
		let pb = String(b).split(".").map((n) => parseInt(n, 10) || 0);
		for(let i = 0; i < Math.max(pa.length, pb.length); i++){
			let diff = (pa[i] || 0) - (pb[i] || 0);
			if(diff != 0) return diff < 0 ? -1 : 1;
		}
		return 0;
	}

	// Removes items from a comma separated list that may have several lines and header lines ("Name:")
	function removeFromListText(text, shouldRemove){
		let changed = false;
		let lines = String(text).split(/\r?\n/).map((line) => {
			if(line.trim().endsWith(":")) return line;
			let items = line.split(",").map((item) => item.trim()).filter((item) => item != "");
			let kept = items.filter((item) => !shouldRemove(item.replace(/\s+/g, "")));
			if(kept.length == items.length) return line;
			changed = true;
			return kept.join(", ");
		});
		return changed ? lines.join("\n") : text;
	}

	// stored: the values from storage.local
	// defaultParams: the current default blocked parameters (data/default-params-by-category.json)
	// Returns { changes: {...} } - changes is empty if nothing needs to be stored
	function migrate(stored, currentVersion, defaultParams){
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

		changes.neat_url_version = currentVersion;
		return { changes: changes };
	}

	NeatURL.migrate = { migrate, compareVersions };
	if(typeof module === "object" && module.exports) module.exports = NeatURL.migrate;
})(globalThis);
