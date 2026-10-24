"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const defaults = require("../src/core/defaults.js");
const domain = require("../src/core/domain.js");
const params = require("../src/core/params.js");
const clean = require("../src/core/clean.js");
const dnr = require("../src/core/dnr.js");
const migrate = require("../src/core/migrate.js");

const DEFAULT_PARAMS = JSON.parse(fs.readFileSync(path.join(ROOT, "data/default-params-by-category.json"), "utf8")).categories.flatMap((c) => c.params);
const SUFFIX_LIST = fs.readFileSync(path.join(ROOT, "data/publicsuffix-ccSLD.txt"), "utf8").split(/\r?\n/).filter((line) => line != "");
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, "cases.json"), "utf8"));

// caseConfig: { blocked, useDefaults, overrides, websites, blacklist, whitelist, cleanNested, keepSigned, textFragments } as stored in the preferences
function makeConfig(caseConfig){
	caseConfig = caseConfig || {};
	return params.compileConfig({
		defaultParams: DEFAULT_PARAMS,
		useDefaultParams: caseConfig.useDefaults,
		overrides: caseConfig.overrides || "",
		blockedParams: caseConfig.blocked || "",
		websites: caseConfig.websites || "all_except",
		blacklist: caseConfig.blacklist || "",
		whitelist: caseConfig.whitelist || "",
		cleanNested: caseConfig.cleanNested,
		keepSigned: caseConfig.keepSigned,
		removeTextFragments: caseConfig.textFragments,
		suffixList: SUFFIX_LIST
	});
}

/// Simulation of Chrome's declarativeNetRequest, as far as the rules of dnr.js need it.
// Behaviour verified in Chrome (see docs/architecture.md):
// * only the matching rule with the highest priority is applied; allow wins over redirect at the same priority
// * the redirected request is matched again
// * a redirect that doesn't change the URL is ignored. Whether Chrome then falls back to rules with a lower
//   priority depends on the kind of rule (urlFilter or regexFilter), so the rules must work in both cases:
//   options.noopBlocks selects the behaviour.
function ruleMatches(rule, url, type){
	let c = rule.condition;
	let host = new URL(url).hostname;
	if(c.resourceTypes && !c.resourceTypes.includes(type)) return false;
	if(c.requestDomains && !c.requestDomains.some((d) => domain.isSameOrSubdomain(host, d))) return false;
	if(c.excludedRequestDomains && c.excludedRequestDomains.some((d) => domain.isSameOrSubdomain(host, d))) return false;
	if(c.urlFilter != undefined){
		if(c.urlFilter != "|http") throw new Error("urlFilter not supported by the simulator: " + c.urlFilter);
		if(!url.startsWith("http")) return false;
	}
	if(c.regexFilter != undefined && !new RegExp(c.regexFilter, c.isUrlFilterCaseSensitive ? "" : "i").test(url)) return false;
	return true;
}

function applyRule(rule, url){
	let redirect = rule.action.redirect;
	if(redirect.regexSubstitution != undefined){
		let substitution = redirect.regexSubstitution.replace(/\$/g, "$$$$").replace(/\\(\d)/g, "$$$1");
		return new URL(url.replace(new RegExp(rule.condition.regexFilter, rule.condition.isUrlFilterCaseSensitive ? "" : "i"), substitution)).href;
	}

	let parsed = new URL(url);
	let transform = redirect.transform;
	if(transform.queryTransform){
		let remove = transform.queryTransform.removeParams;
		let query = clean.removeParams(parsed.search.substring(1), (key) => remove.includes(key));
		parsed.search = query == "" ? "" : "?" + query;
	}
	if(transform.fragment != undefined) parsed.hash = transform.fragment;
	return parsed.href;
}

function simulateDnr(rules, url, type, options){
	type = type || "main_frame";
	let noopBlocks = options && options.noopBlocks;
	let current = new URL(url).href;

	for(let hop = 0; hop < 20; hop++){
		// Highest priority first, allow before redirect at the same priority
		let matching = rules.filter((rule) => ruleMatches(rule, current, type))
			.sort((a, b) => b.priority - a.priority || (a.action.type == "allow" ? -1 : 0) - (b.action.type == "allow" ? -1 : 0));

		let next = current;
		for(let rule of matching){
			if(rule.action.type == "allow") break;
			next = applyRule(rule, current);
			if(next != current || noopBlocks) break;
		}

		if(next == current) return current;
		current = next;
	}
	throw new Error("Too many redirects for " + url);
}

module.exports = { ROOT, defaults, domain, params, clean, dnr, migrate, DEFAULT_PARAMS, SUFFIX_LIST, CASES, makeConfig, simulateDnr };
