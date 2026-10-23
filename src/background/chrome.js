// Chrome: clean URLs with declarativeNetRequest rules (Manifest V3 has no blocking webRequest).
// A non-blocking webRequest listener observes the redirects of these rules, for the counter, the animation and logging.
(function(root){
	"use strict";
	const NeatURL = root.NeatURL;
	const background = NeatURL.background;
	const dnr = browser.declarativeNetRequest;

	const SIGNATURE_KEY = "neat_url_dnr_signature";
	let syncQueue = Promise.resolve();

	// Returns the rules that Chrome accepts, and whether some were too big
	async function validateRules(rules){
		let valid = [];
		let rejected = [];
		let tooBig = false;
		for(let rule of rules){
			if(rule.condition.regexFilter){
				let result = await dnr.isRegexSupported({
					regex: rule.condition.regexFilter,
					isCaseSensitive: !!rule.condition.isUrlFilterCaseSensitive,
					requireCapturing: rule.action.redirect != undefined && rule.action.redirect.regexSubstitution != undefined
				});
				if(!result.isSupported){
					rejected.push({ rule: rule, reason: result.reason });
					if(result.reason == "memoryLimitExceeded") tooBig = true;
					continue;
				}
			}
			valid.push(rule);
		}
		return { valid, rejected, tooBig };
	}

	// Chrome limits the memory of a regex. When a rule is too big, compile again with fewer alternatives per rule.
	async function compileAccepted(state){
		let result;
		for(let maxAlternatives of [6, 3, 1]){
			let rules = NeatURL.dnr.compileDnrRules(state.config, { types: state.types, maxAlternatives: maxAlternatives }).rules;
			result = await validateRules(rules);
			if(!result.tooBig) break;
		}
		for(let { rule, reason } of result.rejected) console.warn("[Neat URL]: skipping unsupported rule (" + reason + ")", rule);
		return result.valid;
	}

	let compiledFor = null;
	let compiled = null;
	let lastFallback = new Map(); // tabId -> { url, time }

	// The rules for a state, compiled once
	function getCompiled(state){
		if(compiledFor != state){
			compiled = NeatURL.dnr.compileDnrRules(state.config, { types: state.types });
			compiledFor = state;
		}
		return compiled;
	}

	async function syncRules(state){
		let rules = [];
		let compiled = getCompiled(state);
		if(state.enabled) rules = compiled.rules;

		// The service worker starts often; only update the rules if they changed
		let signature = JSON.stringify(rules);
		let stored = await browser.storage.local.get(SIGNATURE_KEY);
		if(stored[SIGNATURE_KEY] == signature) return;

		for(let warning of compiled.warnings) console.warn("[Neat URL]: " + warning);
		if(state.enabled) rules = await compileAccepted(state);

		let existing = await dnr.getDynamicRules();
		await dnr.updateDynamicRules({ removeRuleIds: existing.map((rule) => rule.id), addRules: rules });
		await browser.storage.local.set({ [SIGNATURE_KEY]: signature });
		background.log(`${rules.length} declarativeNetRequest rules active`);
	}

	// Every state change (preferences, toggle) rebuilds all rules, one update at a time
	background.onStateChanged((state) => {
		syncQueue = syncQueue.then(() => syncRules(state)).catch((error) => console.error("[Neat URL]: could not update the rules", error));
	});

	// Only the first redirect of a navigation is reported, so each cleaned navigation is counted once
	browser.webRequest.onBeforeRedirect.addListener((details) => {
		if(details.statusCode != 307 || details.redirectUrl == undefined) return;

		background.ensureState().then((state) => {
			if(!state.enabled || !state.types.includes(details.type)) return;
			// Internal redirects are also used by other extensions and HSTS: only count the ones Neat URL would do
			let cleaned = NeatURL.clean.cleanUrl(details.url, state.config);
			if(cleaned == details.url) return;
			// Counted by the fallback in onBeforeRequest
			if(details.type == "main_frame" && usesFallback(details.url, state)) return;
			// Only the first redirect of the chain is reported; the rules end with the same URL as cleanUrl
			background.reportCleaned(details, cleaned);
		});
	}, { urls: ["<all_urls>"] });

	// Some cleaning can't be done by rules: URLs inside parameter values (they would have to be decoded and encoded again),
	// and rules that conflict with an exclusion (for example "remove all parameters except one").
	// For those navigations the tab is updated with the clean URL. The request for the original URL has started by then.
	browser.webRequest.onBeforeRequest.addListener((details) => {
		if(details.tabId < 0) return;

		background.ensureState().then((state) => {
			if(!state.enabled || !state.types.includes("main_frame")) return;

			let cleaned = NeatURL.clean.cleanUrl(details.url, state.config);
			if(cleaned == details.url || !usesFallback(details.url, state)) return;

			// The request after a redirect by the rules comes here too
			let last = lastFallback.get(details.tabId);
			if(last && last.url == cleaned && Date.now() - last.time < 5000) return;
			lastFallback.set(details.tabId, { url: cleaned, time: Date.now() });

			browser.tabs.update(details.tabId, { url: cleaned });
			background.reportCleaned(details, cleaned);
		});
	}, { urls: ["<all_urls>"], types: ["main_frame"] });

	function usesFallback(url, state){
		let cleanedWithoutNested = NeatURL.clean.cleanUrl(url, state.config, { nested: false });
		if(NeatURL.clean.cleanUrl(url, state.config) != cleanedWithoutNested) return true;
		return NeatURL.dnr.needsFallback(url, state.config, getCompiled(state).unsupported);
	}

	background.ensureState();

	NeatURL.chrome = { syncRules };
})(globalThis);
