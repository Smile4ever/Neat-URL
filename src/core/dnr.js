// Compiles the config (params.js) to declarativeNetRequest rules for Chrome.
// See docs/architecture.md for the reasoning behind the rule layout. In short:
// * Only one redirect rule is applied to a request: the matching rule with the highest priority.
//   A redirected request is matched again, so rules can work in a chain.
// * So every domain pattern gets one "union" rule that removes all exact parameters for that pattern,
//   including the global ones and the ones of all broader patterns, plus an allow rule below it that
//   stops the rules of broader patterns (which may remove parameters that are excluded for this pattern).
// * Rules for wildcards, hash parameters and endings have a higher priority, but their regexFilter only
//   matches when they actually change the URL. Each redirect removes something, until the union rule is left.
//   So they are created once per pattern, with only its own entries, above the union rules of all patterns.
//   Only a pattern with an exclusion that overlaps a wildcard gets them again with the merged entries, on top.
// * The blacklist and signed URLs get allow rules with the highest priority. With a whitelist, every rule
//   only covers the part of its domain pattern that is in the whitelist.
// * Some rules can't be expressed (for example "remove all parameters except one"). compileDnrRules returns
//   them as unsupported; chrome.js handles those navigations by updating the tab.
(function(root){
	"use strict";
	const NeatURL = root.NeatURL = root.NeatURL || {};
	const domain = NeatURL.domain || require("./domain.js");
	const params = NeatURL.params || require("./params.js");
	const defaults = NeatURL.defaults || require("./defaults.js");

	const CHROME_RESOURCE_TYPES = ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"];
	const FIREFOX_RESOURCE_TYPES = { "imageset": "image", "beacon": "ping", "object_subrequest": "object", "xslt": "other", "xml_dtd": "other", "web_manifest": "other" };

	// Chrome limits (chrome.declarativeNetRequest.MAX_NUMBER_OF_REGEX_RULES, MAX_NUMBER_OF_DYNAMIC_RULES for redirect rules)
	const MAX_REGEX_RULES = 1000;
	const MAX_UNSAFE_RULES = 5000;
	// Chrome limits a compiled regex to 2KB of memory, so long alternations are split over several rules.
	// chrome.js compiles again with fewer alternatives when Chrome rejects a regex.
	const MAX_ALTERNATIVES = 6;

	// Priority within a pattern; each pattern adds rank * 10 (the number of patterns that cover it)
	const PRIORITY_ALLOW = 0;
	const PRIORITY_UNION = 1;
	const PRIORITY_GWS_RD_ALLOW = 2;
	const PRIORITY_GWS_RD = 3;
	const PRIORITY_WILDCARD = 4;
	const PRIORITY_HASH = 5;
	const PRIORITY_ENDING = 6;
	// Bands: the union rules of all patterns, above them the wildcard, hash and ending rules of all patterns
	// (each pattern only with its own entries), and on top the complete rules of patterns with an exclusion
	// that overlaps a wildcard of a broader pattern.
	const BAND_HIGH = 1000;
	const BAND_TOP = 2000;
	// Blacklist and signed URLs: above every pattern
	const PRIORITY_NEVER_CHANGE = 10000;
	// Text fragments: only match when they change the URL, so they can be above the rules of every pattern
	const PRIORITY_TEXT_FRAGMENT = PRIORITY_NEVER_CHANGE - 1;

	const PORT = "(?::[0-9]+)?";
	// A public suffix: a two-level suffix like co.uk, or a single label like com
	const SUFFIX = "(?:[a-z]{2,3}\\.[a-z]{2,3}|[a-z0-9-]+)";

	function escapeRegex(text){
		return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	function toResourceTypes(types){
		let result = [];
		for(let type of types){
			let mapped = CHROME_RESOURCE_TYPES.includes(type) ? type : FIREFOX_RESOURCE_TYPES[type];
			if(mapped && !result.includes(mapped)) result.push(mapped);
		}
		return result;
	}

	function hostRegex(pattern){
		let d = escapeRegex(pattern.domain);
		switch(pattern.type){
			case "global": return "[^/?#]+";
			case "exact": return "(?:www\\.)?" + d + PORT;
			case "root": return "(?:[^/?#@]+\\.)?" + d + PORT;
			case "suffix": return "(?:www\\.)?" + d + "\\." + SUFFIX + PORT;
			case "rootSuffix": return "(?:[^/?#@]+\\.)?" + d + "\\." + SUFFIX + PORT;
		}
	}

	// Does pattern q match every host that pattern p matches?
	function covers(q, p, suffixSet){
		let minusSuffix = (d) => domain.splitHost(d, suffixSet).minusSuffix;
		switch(q.type){
			case "global":
				return true;
			case "exact":
				return p.type == "exact" && p.domain == q.domain;
			case "root":
				return (p.type == "exact" || p.type == "root") && domain.isSameOrSubdomain(p.domain, q.domain);
			case "suffix":
				return (p.type == "exact" && minusSuffix(p.domain) == q.domain) || (p.type == "suffix" && p.domain == q.domain);
			case "rootSuffix":
				if(p.type == "exact" || p.type == "root") return domain.isSameOrSubdomain(minusSuffix(p.domain), q.domain);
				if(p.type == "suffix" || p.type == "rootSuffix") return domain.isSameOrSubdomain(p.domain, q.domain);
				return false;
		}
		return false;
	}

	// Patterns that partially overlap get an extra pattern for the overlap, so that a host
	// is always matched by one most specific pattern that contains the rules of all others.
	function addIntersections(patterns, suffixSet){
		let keys = new Set(patterns.map(domain.patternKey));
		let add = (pattern) => {
			let key = domain.patternKey(pattern);
			if(keys.has(key)) return false;
			keys.add(key);
			patterns.push(pattern);
			return true;
		};

		let changed = true;
		while(changed){
			changed = false;
			for(let rootPattern of patterns.filter((p) => p.type == "root")){
				let info = domain.splitHost(rootPattern.domain, suffixSet);
				if(info.suffix == "") continue;

				for(let other of patterns){
					// *.google.com and mail.google.* overlap on mail.google.com
					if(other.type == "suffix" && domain.isSameOrSubdomain(other.domain, info.minusSuffix)){
						changed = add({ type: "exact", domain: other.domain + "." + info.suffix }) || changed;
					}
					// *.google.com and *.mail.google.* overlap on *.mail.google.com
					if(other.type == "rootSuffix" && other.domain != info.minusSuffix && domain.isSameOrSubdomain(other.domain, info.minusSuffix)){
						changed = add({ type: "root", domain: other.domain + "." + info.suffix }) || changed;
					}
				}
			}
		}
		return patterns;
	}

	// The part of pattern p that is also in pattern w, or null if they don't overlap
	function intersect(p, w, suffixSet){
		if(covers(w, p, suffixSet)) return p;
		if(covers(p, w, suffixSet)) return w;
		// Like addIntersections: *.google.com and mail.google.* overlap on mail.google.com
		let [rootPattern, other] = p.type == "root" ? [p, w] : [w, p];
		if(rootPattern.type != "root") return null;
		let info = domain.splitHost(rootPattern.domain, suffixSet);
		if(info.suffix == "" || !domain.isSameOrSubdomain(other.domain, info.minusSuffix)) return null;
		if(other.type == "suffix") return { type: "exact", domain: other.domain + "." + info.suffix };
		if(other.type == "rootSuffix") return { type: "root", domain: other.domain + "." + info.suffix };
		return null;
	}

	// A regex can't say "every host except these", so with a whitelist every entry gets the part
	// of its pattern that is in the whitelist (a global entry gets the whitelist patterns themselves).
	function restrictToWhitelist(config){
		if(config.whitelist.length == 0) return config.entries;
		let result = new Map();
		for(let entry of config.entries){
			for(let allowed of config.whitelist){
				let pattern = intersect(entry.pattern, allowed, config.suffixSet);
				if(pattern) result.set(entry.raw + " " + domain.patternKey(pattern), Object.assign({}, entry, { pattern: pattern }));
			}
		}
		return Array.from(result.values());
	}

	function knownNamesForPrefix(prefix, config){
		let names = defaults.VERSION_4_DEFAULT_PARAMS.concat(config.entries.filter((e) => e.kind == "query" && params.isExactName(e)).map((e) => e.name));
		return names.map((name) => name.split("@")[0]).filter((name) => name.startsWith(prefix) && !name.includes("*"));
	}

	function unique(array){
		return Array.from(new Set(array));
	}

	function chunk(array, size){
		let result = [];
		for(let i = 0; i < array.length; i += size) result.push(array.slice(i, i + size));
		return result;
	}

	// Could an exclusion match a parameter that this (non-exact) query entry removes?
	function conflictsWithExclusion(entry, exclude){
		if(exclude.all || entry.all) return true;
		if(entry.value != undefined) return params.entryMatchesKey(exclude, entry.name, entry.value);
		if(exclude.keyLength != undefined){
			if(entry.keyLength != undefined) return entry.keyLength == exclude.keyLength;
			return exclude.keyLength >= entry.name.length; // a name with this prefix and length exists
		}
		if(exclude.prefix){
			if(entry.keyLength != undefined) return entry.keyLength >= exclude.name.length;
			return exclude.name.startsWith(entry.name) || entry.name.startsWith(exclude.name);
		}
		// An exact name, possibly with a value
		return params.entryMatchesKey(entry, exclude.name, exclude.value);
	}

	// Does an exclusion overlap a wildcard, value or name length? The rules of broader patterns must not
	// apply to such a pattern, because they would remove the excluded parameter.
	function hasConflict(entries){
		let excludes = entries.filter((e) => e.kind == "exclude");
		return entries.some((e) => e.kind == "query" && !params.isExactName(e) && excludes.some((exclude) => conflictsWithExclusion(e, exclude)));
	}

	// Collects everything that applies to the hosts of one pattern.
	// Entries that can't be expressed as rules for this pattern are added to unsupported.
	function mergeEntries(pattern, entries, config, unsupported){
		let byKind = (kind) => entries.filter((e) => e.kind == kind);
		let excludes = byKind("exclude");
		let isExcluded = (key) => excludes.some((e) => params.entryMatchesKey(e, key, undefined));

		let query = byKind("query");
		let removeNames = query.filter(params.isExactName).map((e) => e.name);
		let prefixes = [];
		let segments = []; // regex for one whole query parameter ("ref=share")
		let removeAll = false;

		for(let entry of query.filter((e) => !params.isExactName(e))){
			let conflicts = excludes.some((exclude) => conflictsWithExclusion(entry, exclude));
			if(conflicts){
				// A regex can't skip one specific parameter. For a wildcard the known names are close enough;
				// the other forms are left to chrome.js.
				if(entry.prefix) removeNames = removeNames.concat(knownNamesForPrefix(entry.name, config));
				else unsupported.push({ pattern: pattern, raw: entry.raw });
				continue;
			}

			if(entry.all) removeAll = true;
			else if(entry.prefix) prefixes.push(entry.name);
			else if(entry.keyLength != undefined) segments.push("[^=&#]{" + entry.keyLength + "}(?:=[^&#]*)?");
			else segments.push(escapeRegex(entry.name) + "=" + escapeRegex(entry.value));
		}

		return {
			removeNames: unique(removeNames.filter((name) => !isExcluded(name))),
			prefixes: unique(prefixes),
			segments: unique(segments),
			removeAll: removeAll,
			hashClear: byKind("hashClear").length > 0,
			hashExact: unique(byKind("hashExact").map((e) => e.name)),
			hashParams: byKind("hashParam"),
			endings: byKind("ending"),
			gwsRd: entries.some((e) => e.raw == "gws_rd@google.*")
		};
	}

	function regexRedirect(regexFilter, substitution){
		return {
			action: { type: "redirect", redirect: { regexSubstitution: substitution } },
			condition: { regexFilter: regexFilter, isUrlFilterCaseSensitive: true }
		};
	}

	function buildRulesForPattern(pattern, merged, maxAlternatives){
		let rules = [];
		let H = "https?://" + hostRegex(pattern);

		// All rules use a regexFilter. Chrome picks the highest priority rule per kind of rule (regexFilter or urlFilter)
		// and a redirect that doesn't change the URL gives no action, so a urlFilter rule with a lower priority
		// could still be applied. With one kind of rule, such a redirect stops the rules below it.
		let hostCondition = { regexFilter: "^" + H + "/" };

		let removeParams = (names) => ({ type: "redirect", redirect: { transform: { queryTransform: { removeParams: names } } } });

		// The rules of this pattern contain everything of the broader patterns. In case a future Chrome version
		// does fall back to lower priorities, this allow rule stops the rules of broader patterns (which may
		// remove parameters that are excluded for this pattern).
		if(pattern.type != "global"){
			rules.push({ priority: PRIORITY_ALLOW, action: { type: "allow" }, condition: Object.assign({}, hostCondition) });
		}

		// Union rule: all exact parameters
		if(merged.removeNames.length > 0){
			rules.push({ priority: PRIORITY_UNION, action: removeParams(merged.removeNames), condition: Object.assign({}, hostCondition) });
		}

		// gws_rd=cr must be kept on google.com (https://github.com/Smile4ever/firefoxaddons/issues/76)
		if(merged.gwsRd && pattern.type == "exact" && pattern.domain == "google.com"){
			let gwsRdFilter = "^" + H + "/[^#]*[?&]gws_rd=cr(?:[&#]|$)";
			rules.push({ priority: PRIORITY_GWS_RD_ALLOW, action: { type: "allow" }, condition: { regexFilter: gwsRdFilter } });

			let names = merged.removeNames.filter((name) => name != "gws_rd");
			if(names.length > 0) rules.push({ priority: PRIORITY_GWS_RD, action: removeParams(names), condition: { regexFilter: gwsRdFilter } });
		}

		// Wildcards (utm_*), values (ref=share) and name lengths (KEY{n}): one run of consecutive parameters per redirect.
		// S matches one whole parameter. Chrome limits a compiled regex to 2KB, so the alternatives are split over several rules.
		let alternatives = chunk(merged.prefixes, maxAlternatives).map((prefixes) => "(?:" + prefixes.map(escapeRegex).join("|") + ")[^&#]*")
			.concat(chunk(merged.segments, maxAlternatives).map((segments) => "(?:" + segments.join("|") + ")"));
		for(let S of alternatives){
			let wildcardRules = [
				// ?utm_a=1 (the last parameter)
				regexRedirect("^(" + H + "/[^?#]*)\\?" + S + "(#.*)?$", "\\1\\2"),
				// ?utm_a=1&utm_b=2&x=1
				regexRedirect("^(" + H + "/[^?#]*\\?)(?:" + S + "&)+([^#]*(?:#.*)?)$", "\\1\\2"),
				// ?x=1&utm_a=1&utm_b=2
				regexRedirect("^(" + H + "/[^?#]*\\?[^#]*?)(?:&" + S + ")+((?:&[^#]*)?(?:#.*)?)$", "\\1\\2")
			];
			for(let rule of wildcardRules){
				rule.priority = PRIORITY_WILDCARD;
				rules.push(rule);
			}
		}

		// * removes the whole query
		if(merged.removeAll){
			let rule = regexRedirect("^(" + H + "/[^?#]*)\\?[^#]*(#.*)?$", "\\1\\2");
			rule.priority = PRIORITY_WILDCARD;
			rules.push(rule);
		}

		// Hash parameters (Chrome does see the fragment of a navigation)
		if(merged.hashClear){
			rules.push({ priority: PRIORITY_HASH, action: { type: "redirect", redirect: { transform: { fragment: "" } } }, condition: { regexFilter: "^" + H + "[^#]*#" } });
		}else{
			if(merged.hashExact.length > 0){
				let exact = merged.hashExact.map(escapeRegex).join("|");
				let rule = regexRedirect("^(" + H + "[^#]*)(?:" + exact + ")$", "\\1");
				rule.priority = PRIORITY_HASH;
				rules.push(rule);
			}

			let hashKeys = unique(merged.hashParams.map((e) => escapeRegex(e.name) + (e.prefix ? "[^&=]*" : "") + "(?:=[^&]*)?"));
			for(let keys of chunk(hashKeys, maxAlternatives)){
				let K = "(?:" + keys.join("|") + ")";
				let hashRules = [
					regexRedirect("^(" + H + "[^#]*)#(?:" + K + "&)*" + K + "$", "\\1"),
					regexRedirect("^(" + H + "[^#]*#)(?:" + K + "&)+(.+)$", "\\1\\2"),
					regexRedirect("^(" + H + "[^#]*#.*?)(?:&" + K + ")+((?:&.*)?)$", "\\1\\2")
				];
				for(let rule of hashRules){
					rule.priority = PRIORITY_HASH;
					rules.push(rule);
				}
			}
		}

		// Ending rules: cut the path at the last occurrence of the token and drop the query
		for(let ending of merged.endings){
			let T = escapeRegex(ending.name);
			let endingRules = [];
			if(ending.force){
				endingRules.push(regexRedirect("^(" + H + "(?:/[^?#]*)?)" + T + "[^?#]*(?:\\?[^#]*)?(#.*)?$", "\\1\\2"));
			}else{
				// Only when no query parameters are left
				endingRules.push(regexRedirect("^(" + H + "(?:/[^?#]*)?)" + T + "[^?#]*(#.*)?$", "\\1\\2"));
				// Amazon product pages: always
				endingRules.push(regexRedirect("^(" + H + "/(?:[^?#]*/)?dp/[^?#]*)" + T + "[^?#]*(?:\\?[^#]*)?(#.*)?$", "\\1\\2"));
			}
			for(let rule of endingRules){
				rule.priority = PRIORITY_ENDING;
				rules.push(rule);
			}
		}

		return rules;
	}

	// The text directives of the fragment directive (#intro:~:text=a&text=b), like removeTextDirectives() in clean.js.
	// Each redirect removes one run of them; the redirected request is matched again.
	function buildTextFragmentRules(pattern){
		let H = "https?://" + hostRegex(pattern);
		let T = "text=[^&]*";
		return [
			// #:~:text=a&text=b: only text directives and no anchor
			regexRedirect("^(" + H + "[^#]*)#:~:(?:" + T + "&)*" + T + "$", "\\1"),
			// #intro:~:text=a: only text directives after an anchor
			regexRedirect("^(" + H + "[^#]*#.+?):~:(?:" + T + "&)*" + T + "$", "\\1"),
			// #:~:text=a&other: text directives at the start
			regexRedirect("^(" + H + "[^#]*#.*?:~:)(?:" + T + "&)+(.*)$", "\\1\\2"),
			// #:~:other&text=a: text directives after another directive
			regexRedirect("^(" + H + "[^#]*#.*?:~:[^#]*?)(?:&" + T + ")+((?:&.*)?)$", "\\1\\2")
		].map((rule) => Object.assign(rule, { priority: PRIORITY_TEXT_FRAGMENT }));
	}

	// options: { types: ["main_frame"], firstId: 1, maxAlternatives: 6 }
	function compileDnrRules(config, options){
		options = options || {};
		let warnings = [];
		let resourceTypes = toResourceTypes(options.types || ["main_frame"]);
		if(resourceTypes.length == 0){
			warnings.push("No supported request types; no rules are created.");
			return { rules: [], warnings: warnings, unsupported: [] };
		}

		let groups = new Map();
		let patterns = [{ type: "global", domain: "" }];
		groups.set("global:", []);

		let restricted = restrictToWhitelist(config);
		for(let entry of restricted){
			let key = domain.patternKey(entry.pattern);
			if(!groups.has(key)){
				groups.set(key, []);
				patterns.push(entry.pattern);
			}
			groups.get(key).push(entry);
		}

		// Make sure the gws_rd exception for google.com gets its own pattern
		if(restricted.some((e) => e.raw == "gws_rd@google.*")) patterns.push({ type: "exact", domain: "google.com" });
		patterns = addIntersections(unique(patterns.map(domain.patternKey)).map((key) => patterns.find((p) => domain.patternKey(p) == key)), config.suffixSet);

		let rules = [];
		let unsupported = [];

		// Never change blacklisted domains and signed URLs
		for(let pattern of config.blacklist){
			rules.push({ priority: PRIORITY_NEVER_CHANGE, action: { type: "allow" }, condition: { regexFilter: "^https?://" + hostRegex(pattern) + "/" } });
		}
		if(config.keepSigned){
			rules.push({ priority: PRIORITY_NEVER_CHANGE, action: { type: "allow" }, condition: { regexFilter: "^[^#]*[?&](?:sig|hmac|[^&=#]*signature)(?:[=&#]|$)" } });
		}

		// With a whitelist, only on the whitelisted domains (the blacklist and signed URLs have allow rules above)
		if(config.removeTextFragments){
			let textPatterns = config.whitelist.length > 0 ? config.whitelist : [{ type: "global", domain: "" }];
			for(let pattern of textPatterns) rules.push(...buildTextFragmentRules(pattern));
		}

		let maxAlternatives = options.maxAlternatives || MAX_ALTERNATIVES;
		let add = (rule, priority) => {
			rule.priority += priority;
			rules.push(rule);
		};
		for(let pattern of patterns){
			let supersets = patterns.filter((q) => covers(q, pattern, config.suffixSet));
			let entries = [].concat(...supersets.map((q) => groups.get(domain.patternKey(q)) || []));
			let rank = supersets.length;

			if(hasConflict(entries)){
				for(let rule of buildRulesForPattern(pattern, mergeEntries(pattern, entries, config, unsupported), maxAlternatives)) add(rule, BAND_TOP + rank * 10);
				continue;
			}

			// The rules above the union only match when they change the URL, so the broader patterns don't need to be repeated
			for(let rule of buildRulesForPattern(pattern, mergeEntries(pattern, entries, config, unsupported), maxAlternatives)){
				if(rule.priority < PRIORITY_WILDCARD) add(rule, rank * 10);
			}
			let own = groups.get(domain.patternKey(pattern)) || [];
			for(let rule of buildRulesForPattern(pattern, mergeEntries(pattern, own, config, unsupported), maxAlternatives)){
				if(rule.priority >= PRIORITY_WILDCARD) add(rule, BAND_HIGH + rank * 10);
			}
		}

		for(let rule of rules) rule.condition.resourceTypes = resourceTypes;

		let id = options.firstId || 1;
		for(let rule of rules) rule.id = id++;

		let regexCount = rules.filter((rule) => rule.condition.regexFilter).length;
		if(regexCount > MAX_REGEX_RULES) warnings.push("Too many regex rules (" + regexCount + " > " + MAX_REGEX_RULES + ").");
		if(rules.length > MAX_UNSAFE_RULES) warnings.push("Too many rules (" + rules.length + " > " + MAX_UNSAFE_RULES + ").");

		return { rules: rules, warnings: warnings, unsupported: unsupported };
	}

	// Does a URL need a rule that compileDnrRules couldn't create? (see chrome.js)
	function needsFallback(url, config, unsupported){
		if(unsupported.length == 0) return false;
		let parsed;
		try{
			parsed = new URL(url);
		}catch(ex){
			return false;
		}
		let active = NeatURL.clean.getActiveEntries(parsed, config);
		if(active == null) return false;

		let hostInfo = domain.splitHost(parsed.hostname, config.suffixSet);
		return unsupported.some((u) => domain.matchesPattern(u.pattern, hostInfo) && active.some((e) => e.raw == u.raw));
	}

	NeatURL.dnr = { compileDnrRules, needsFallback, toResourceTypes, covers, addIntersections, intersect, hostRegex, escapeRegex };
	if(typeof module === "object" && module.exports) module.exports = NeatURL.dnr;
})(globalThis);
