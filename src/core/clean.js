// URL cleaning engine. Used directly by Firefox (blocking webRequest) and as the reference
// behaviour for the Chrome rules (dnr.js) in the tests.
(function(root){
	"use strict";
	const NeatURL = root.NeatURL = root.NeatURL || {};
	const domain = NeatURL.domain || require("./domain.js");
	const params = NeatURL.params || require("./params.js");

	function decode(text){
		text = text.replace(/\+/g, " ");
		try{
			return decodeURIComponent(text);
		}catch(ex){
			return text;
		}
	}

	// "a=1" -> { key: "a", value: "1" }, "flag" -> { key: "flag", value: undefined }
	function decodePart(part){
		let index = part.indexOf("=");
		if(index < 0) return { key: decode(part), value: undefined };
		return { key: decode(part.substring(0, index)), value: decode(part.substring(index + 1)) };
	}

	// Removes parameters from a raw "a=1&b=2" string. Other parameters are kept exactly as they were,
	// so their encoding doesn't change (URLSearchParams would turn "flag" into "flag=").
	// shouldRemove(key, value) gets the decoded name and value.
	function removeParams(queryString, shouldRemove){
		if(queryString == "") return queryString;
		return queryString.split("&").filter((part) => {
			if(part == "") return true;
			let decoded = decodePart(part);
			return !shouldRemove(decoded.key, decoded.value);
		}).join("&");
	}

	// Signed URLs (https://github.com/Smile4ever/Neat-URL/issues/315) contain a signature over the whole URL.
	// Removing any parameter makes the server reject them, so they are left alone.
	function isSignatureKey(key){
		key = key.toLowerCase();
		return key == "sig" || key == "hmac" || key.endsWith("signature");
	}

	function isSigned(queryString){
		return queryString != "" && queryString.split("&").some((part) => isSignatureKey(decodePart(part).key));
	}

	// A parameter value that is a URL itself, with or without a scheme:
	// ?url=example2.com%3Futm_source%3Dx or ?to=https://example2.com/?utm_source=x
	const NESTED_URL = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?::\d+)?(?:\/[^?#]*)?\?/i;
	const MAX_NESTING = 3;

	function cleanNestedValue(raw, config, options, depth){
		let decoded;
		try{
			decoded = decodeURIComponent(raw);
		}catch(ex){
			return raw;
		}
		if(!NESTED_URL.test(decoded)) return raw;

		let hasScheme = /^https?:\/\//i.test(decoded);
		let inner = hasScheme ? decoded : "https://" + decoded;
		let cleaned = cleanUrlAtDepth(inner, config, options, depth + 1);
		if(cleaned == inner) return raw;

		if(!hasScheme) cleaned = cleaned.replace(/^https:\/\//, "");
		// Keep the style of the original value: encoded or not
		return raw.includes("%") ? encodeURIComponent(cleaned) : cleaned;
	}

	function cleanNestedParams(queryString, config, options, depth){
		if(queryString == "") return queryString;
		return queryString.split("&").map((part) => {
			let index = part.indexOf("=");
			if(index < 0) return part;
			return part.substring(0, index + 1) + cleanNestedValue(part.substring(index + 1), config, options, depth);
		}).join("&");
	}

	// Workaround for https://github.com/Smile4ever/firefoxaddons/issues/76
	function isGwsRdException(entry, hostInfo, url){
		return entry.raw == "gws_rd@google.*" && hostInfo.root == "google.com" && url.searchParams.get("gws_rd") == "cr";
	}

	// Returns the active entries for a URL, or null if the URL must not be changed
	function getActiveEntries(url, config){
		if(url.protocol != "http:" && url.protocol != "https:") return null;

		let hostInfo = domain.splitHost(url.hostname, config.suffixSet);
		if(domain.isBlacklisted(hostInfo, config.blacklist)) return null;
		if(config.keepSigned && isSigned(url.search.substring(1))) return null;

		return config.entries.filter((entry) => domain.matchesPattern(entry.pattern, hostInfo) && !isGwsRdException(entry, hostInfo, url));
	}

	// options.endings: set to false to skip ending rules
	// options.nested: set to false to skip URLs inside parameter values (config.cleanNested)
	function cleanUrl(href, config, options){
		return cleanUrlAtDepth(href, config, options || {}, 0);
	}

	function cleanUrlAtDepth(href, config, options, depth){
		let url;
		try{
			url = new URL(href);
		}catch(ex){
			return href;
		}

		let active = getActiveEntries(url, config);
		if(active == null) return href;

		let byKind = (kind) => active.filter((entry) => entry.kind == kind);
		let excludes = byKind("exclude");
		let queryEntries = byKind("query");
		let hashEntries = byKind("hashParam");

		// The excluded parameter always takes precedence, also over wildcards
		let isExcluded = (key, value) => excludes.some((entry) => params.entryMatchesKey(entry, key, value));

		let search = url.search.substring(1);
		let newSearch = removeParams(search, (key, value) => !isExcluded(key, value) && queryEntries.some((entry) => params.entryMatchesKey(entry, key, value)));
		if(config.cleanNested && options.nested !== false && depth < MAX_NESTING){
			newSearch = cleanNestedParams(newSearch, config, options, depth);
		}

		let hash = url.hash;
		if(hash != ""){
			if(byKind("hashClear").length > 0 || byKind("hashExact").some((entry) => entry.name == hash)){
				hash = "";
			}else if(hashEntries.length > 0){
				let fragment = removeParams(hash.substring(1), (key, value) => hashEntries.some((entry) => params.entryMatchesKey(entry, key, value)));
				hash = fragment == "" ? "" : "#" + fragment;
			}
		}

		// Ending rules cut the path at the last occurrence of the token, e.g. $/ref@amazon.*
		// They only apply if no query parameters are left, unless they start with $$ or it is an Amazon product page (/dp/)
		let path = url.pathname;
		if(options.endings !== false){
			for(let entry of byKind("ending")){
				let index = path.lastIndexOf(entry.name);
				if(index < 0) continue;

				let isProductPage = path.substring(0, index).includes("/dp/");
				if(newSearch == "" || entry.force || isProductPage){
					path = path.substring(0, index);
				}
			}
		}

		if(path != url.pathname) newSearch = "";
		if(newSearch == search && hash == url.hash && path == url.pathname) return href;

		url.pathname = path == "" ? "/" : path;
		url.search = newSearch == "" ? "" : "?" + newSearch;
		url.hash = hash;
		return url.href;
	}

	NeatURL.clean = { cleanUrl, removeParams, getActiveEntries, isSignatureKey };
	if(typeof module === "object" && module.exports) module.exports = NeatURL.clean;
})(globalThis);
