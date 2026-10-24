// Host name handling: splitting a host into its parts and matching domain patterns.
//
// Domain patterns (the part after @ in a parameter rule):
// * example.com    exact     example.com and www.example.com
// * *.example.com  root      example.com and every subdomain
// * google.*       suffix    google.<public suffix>, with or without www
// * *.google.*     rootSuffix google.<public suffix> and every subdomain
(function(root){
	"use strict";
	const NeatURL = root.NeatURL = root.NeatURL || {};

	function stripWww(host){
		return host.replace(/^www\./i, "");
	}

	function isIpAddress(host){
		return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":") || host.startsWith("[");
	}

	// suffixSet contains two-level public suffixes such as co.uk (data/publicsuffix-ccSLD.txt).
	// Returns { host, root, minusSuffix, suffix } where host has www stripped:
	// news.google.co.uk -> { host: "news.google.co.uk", root: "google.co.uk", minusSuffix: "news.google", suffix: "co.uk" }
	function splitHost(host, suffixSet){
		host = stripWww(String(host).toLowerCase());
		let labels = host.split(".");

		if(isIpAddress(host) || labels.length < 2){
			return { host: host, root: host, minusSuffix: host, suffix: "" };
		}

		let suffixLength = 1;
		if(labels.length >= 3 && suffixSet && suffixSet.has(labels.slice(-2).join("."))){
			suffixLength = 2;
		}

		let suffix = labels.slice(-suffixLength).join(".");
		let minusSuffix = labels.slice(0, -suffixLength).join(".");
		let rootDomain = labels.slice(-suffixLength - 1).join(".");

		return { host: host, root: rootDomain, minusSuffix: minusSuffix, suffix: suffix };
	}

	// Parses the domain part of a rule. Returns null for an empty or invalid domain.
	function parsePattern(domain){
		if(domain == null) return { type: "global", domain: "" };

		domain = domain.trim().toLowerCase();
		let startsWithWildcard = domain.startsWith("*.");
		let endsWithWildcard = domain.endsWith(".*");

		if(startsWithWildcard) domain = domain.substring(2);
		if(endsWithWildcard) domain = domain.substring(0, domain.length - 2);
		domain = stripWww(domain);

		if(domain == "" || domain.includes("*") || domain.includes("/")) return null;

		if(startsWithWildcard && endsWithWildcard) return { type: "rootSuffix", domain: domain };
		if(startsWithWildcard) return { type: "root", domain: domain };
		if(endsWithWildcard) return { type: "suffix", domain: domain };
		return { type: "exact", domain: domain };
	}

	function patternKey(pattern){
		return pattern.type + ":" + pattern.domain;
	}

	function isSameOrSubdomain(host, domain){
		return host == domain || host.endsWith("." + domain);
	}

	// hostInfo is the result of splitHost
	function matchesPattern(pattern, hostInfo){
		switch(pattern.type){
			case "global":
				return true;
			case "exact":
				return hostInfo.host == pattern.domain;
			case "root":
				return isSameOrSubdomain(hostInfo.host, pattern.domain);
			case "suffix":
				return hostInfo.minusSuffix == pattern.domain;
			case "rootSuffix":
				return isSameOrSubdomain(hostInfo.minusSuffix, pattern.domain);
		}
		return false;
	}

	// blacklist: domain patterns (params.parseDomainList), hostInfo: the result of splitHost
	function isBlacklisted(hostInfo, blacklist){
		return blacklist.some((pattern) => matchesPattern(pattern, hostInfo));
	}

	// An empty whitelist allows every website
	function isWhitelisted(hostInfo, whitelist){
		return whitelist.length == 0 || whitelist.some((pattern) => matchesPattern(pattern, hostInfo));
	}

	NeatURL.domain = { stripWww, splitHost, parsePattern, patternKey, matchesPattern, isSameOrSubdomain, isBlacklisted, isWhitelisted };
	if(typeof module === "object" && module.exports) module.exports = NeatURL.domain;
})(globalThis);
