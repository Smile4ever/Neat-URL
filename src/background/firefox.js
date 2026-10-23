// Firefox: clean URLs with a blocking webRequest listener (supported in Manifest V3 on Firefox).
(function(root){
	"use strict";
	const NeatURL = root.NeatURL;
	const background = NeatURL.background;

	const applyAfter = 1000;
	// Used by addons.mozilla.org handling
	let globalNeatURL = "";
	let globalCurrentURL = "";
	let globalTabId = -1;

	function handleRequest(details){
		let state = background.getState();
		if(!state.enabled || !state.types.includes(details.type)) return;

		let newUrl;
		try{
			newUrl = NeatURL.clean.cleanUrl(details.url, state.config);
		}catch(ex){
			console.error("[Neat URL]: error while cleaning " + details.url, ex);
			return;
		}
		if(newUrl == details.url) return;

		let leanURL = new URL(newUrl);
		if(leanURL.hostname == "addons.mozilla.org"){
			// webRequest blocking is not supported on mozilla.org, lets fix this
			// but only if we are navigating to addons.mozilla.org and there doesn't exist a tab yet with the same URL
			if(details.type != "main_frame") return;
			if(globalNeatURL == newUrl) return;

			globalNeatURL = newUrl;
			globalCurrentURL = details.url;
			globalTabId = details.tabId;

			setTimeout(() => {
				browser.tabs.query({ url: globalCurrentURL }).then((tabs) => {
					if(globalNeatURL == null || globalNeatURL == "") return;

					for(let tab of tabs){
						background.log(`really updating '${tab.url}' to '${globalNeatURL}'`);
						browser.tabs.update(tab.id, { url: globalNeatURL });
						background.reportCleaned({ url: tab.url, type: details.type, tabId: globalTabId }, globalNeatURL);
					}

					setTimeout(() => {
						globalNeatURL = "";
						globalCurrentURL = "";
					}, applyAfter);
				}, null);
			}, applyAfter);
		}else{
			background.reportCleaned(details, newUrl);
		}

		return { redirectUrl: newUrl };
	}

	function onBeforeRequest(details){
		// Synchronous while the state is loaded, so requests aren't delayed.
		// Right after the background (re)starts, the request waits for the state.
		if(background.getState() != null) return handleRequest(details);
		return background.ensureState().then(() => handleRequest(details), (error) => {
			console.error("[Neat URL]: could not load the preferences", error);
		});
	}

	// Registered for all request types: neat_url_types is checked in handleRequest,
	// because the listener must be registered synchronously before the preferences are known.
	browser.webRequest.onBeforeRequest.addListener(onBeforeRequest, { urls: ["<all_urls>"] }, ["blocking"]);

	background.ensureState();

	NeatURL.firefox = { onBeforeRequest };
})(globalThis);
