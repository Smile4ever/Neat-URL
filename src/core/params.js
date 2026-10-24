// Parsing of parameter rules (see README.md, "Parameter rules") into a structured config
// that is shared by the Firefox engine (clean.js) and the Chrome engine (dnr.js).
(function(root){
	"use strict";
	const NeatURL = root.NeatURL = root.NeatURL || {};
	const domain = NeatURL.domain || require("./domain.js");

	// A label at the start of a line: "Tweakers: nb@tweakers.net, u@tweakers.net".
	// The colon must be followed by a space, and a label has no comma, @ or =, so rules are never mistaken for a label.
	const LABEL = /^\s*[^,@=]+?:(?:\s+|$)/;

	// Splits a line into its label ("Tweakers: ", or "" without a label) and its rules.
	// A line that ends with a colon is a header ("Campaign tracking:") and has no rules.
	function splitLabel(line){
		if(line.trim().endsWith(":")) return { label: line, rules: "" };
		let match = LABEL.exec(line);
		return match ? { label: match[0], rules: line.substring(match[0].length) } : { label: "", rules: line };
	}

	// "a, b ,c" -> ["a", "b", "c"]. Whitespace is not allowed inside a rule.
	// Headers ("Campaign tracking:") and labels ("Tweakers: ") are skipped.
	function parseList(value){
		if(value == undefined) return [];
		if(Array.isArray(value)) return value.filter((item) => item != "");
		return String(value).split(/\r?\n/)
			.map((line) => splitLabel(line).rules)
			.join(",")
			.replace(/\s+/g, "")
			.split(",")
			.filter((item) => item != "");
	}

	// Default parameters minus the overrides, plus the user's own parameters
	function effectiveParams(defaultParams, overrides, blockedParams){
		let result = defaultParams.filter((param) => !overrides.includes(param));
		for(let param of blockedParams){
			if(!result.includes(param)) result.push(param);
		}
		return result;
	}

	// Returns null for rules that can't be parsed.
	// kind is one of: query, exclude, ending, hashParam, hashExact, hashClear
	// A query or exclude entry has one of these forms:
	// * name            exact name
	// * name* (prefix)  every parameter that starts with name
	// * name=value      the parameter only with this value
	// * KEY{n}          every parameter with a name of n characters
	// * * (all)         every parameter
	function parseEntry(raw){
		let param = raw;
		let pattern = { type: "global", domain: "" };

		let index = raw.lastIndexOf("@");
		if(index > -1){
			param = raw.substring(0, index);
			pattern = domain.parsePattern(raw.substring(index + 1));
			if(pattern == null) return null;
		}

		if(param == "") return null;

		let entry = { raw: raw, pattern: pattern, kind: "query", name: param, prefix: false, force: false };

		if(param.startsWith("!")){
			entry.kind = "exclude";
			entry.name = param.substring(1);
		}else if(param.startsWith("$")){
			entry.kind = "ending";
			entry.force = param.startsWith("$$");
			entry.name = param.replace(/^\$\$?/, "");
		}else if(param == "#*" || param == "#?*"){
			entry.kind = "hashClear";
			entry.name = "";
		}else if(param.startsWith("#?")){
			entry.kind = "hashParam";
			entry.name = param.substring(2);
		}else if(param.startsWith("#")){
			entry.kind = "hashExact";
			entry.name = param;
		}

		if(entry.kind == "query" || entry.kind == "exclude"){
			let keyLength = /^KEY\{(\d+)\}$/.exec(entry.name);
			if(entry.name == "*"){
				entry.all = true;
				return entry;
			}
			if(keyLength){
				entry.keyLength = parseInt(keyLength[1], 10);
				return entry.keyLength > 0 ? entry : null;
			}

			let equals = entry.name.indexOf("=");
			if(equals > -1){
				entry.value = entry.name.substring(equals + 1);
				entry.name = entry.name.substring(0, equals);
				return entry.name == "" || entry.name.includes("*") ? null : entry;
			}
		}

		// A trailing * is a prefix wildcard: utm_* matches utm_source, utm_medium, ...
		if(["query", "exclude", "hashParam"].includes(entry.kind) && entry.name.indexOf("*") == entry.name.length - 1){
			entry.prefix = true;
			entry.name = entry.name.substring(0, entry.name.length - 1);
		}

		if(entry.name == "" && entry.kind != "hashClear") return null;
		return entry;
	}

	// Blacklist entries are domain patterns. A plain domain also matches its subdomains.
	function parseBlacklist(list){
		let result = [];
		for(let item of parseList(list)){
			let pattern = domain.parsePattern(item.replace(/^\./, ""));
			if(pattern == null) continue;
			if(pattern.type == "exact") pattern.type = "root";
			result.push(pattern);
		}
		return result;
	}

	// options: { defaultParams: [], overrides: "" | [], blockedParams: "" | [], blacklist: "" | [], suffixList: [],
	//            cleanNested: false, keepSigned: true }
	function compileConfig(options){
		let params = effectiveParams(options.defaultParams || [], parseList(options.overrides), parseList(options.blockedParams));
		let entries = [];
		let invalid = [];

		for(let raw of params){
			let entry = parseEntry(raw);
			if(entry == null) invalid.push(raw);
			else entries.push(entry);
		}

		return {
			entries: entries,
			invalid: invalid,
			blacklist: parseBlacklist(options.blacklist),
			cleanNested: options.cleanNested === true,
			keepSigned: options.keepSigned !== false,
			suffixSet: options.suffixSet || new Set(options.suffixList || [])
		};
	}

	// Is this an exact parameter name, that declarativeNetRequest can remove with removeParams?
	function isExactName(entry){
		return !entry.prefix && !entry.all && entry.keyLength == undefined && entry.value == undefined;
	}

	// value is the decoded value, or undefined for a parameter without =
	function entryMatchesKey(entry, key, value){
		if(entry.all) return true;
		if(entry.keyLength != undefined) return key.length == entry.keyLength;
		if(entry.value != undefined) return key == entry.name && value == entry.value;
		return entry.prefix ? key.startsWith(entry.name) : key == entry.name;
	}

	NeatURL.params = { parseList, splitLabel, effectiveParams, parseEntry, parseBlacklist, compileConfig, entryMatchesKey, isExactName };
	if(typeof module === "object" && module.exports) module.exports = NeatURL.params;
})(globalThis);
