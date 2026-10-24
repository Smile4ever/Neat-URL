// Firefox: clean URLs with a blocking webRequest listener (supported in Manifest V3 on Firefox).
(function(root){
	"use strict";
	const NeatURL = root.NeatURL;
	const background = NeatURL.background;

	// Firefox doesn't show requests to these domains to webRequest (extensions.webextensions.restrictedDomains),
	// but tabs.onUpdated does report their URL. Not accounts.firefox.com: changing a sign-in URL can break it.
	const RESTRICTED_HOSTS = ["addons.mozilla.org", "support.mozilla.org"];

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

		background.reportCleaned(details, newUrl);
		return { redirectUrl: newUrl };
	}

	// A tab on a restricted domain: load the clean URL in the tab, in place of the history entry with the parameters
	function onTabUpdated(tabId, changeInfo){
		let state = background.getState();
		if(changeInfo.url == undefined || state == null || !state.enabled || !state.types.includes("main_frame")) return;
		let host;
		try{
			host = new URL(changeInfo.url).hostname;
		}catch(ex){
			return;
		}
		if(!RESTRICTED_HOSTS.includes(host)) return;

		let newUrl = NeatURL.clean.cleanUrl(changeInfo.url, state.config);
		if(newUrl == changeInfo.url) return;
		background.reportCleaned({ url: changeInfo.url, type: "main_frame", tabId: tabId }, newUrl);
		// Firefox for Android may not know loadReplace
		Promise.resolve().then(() => browser.tabs.update(tabId, { url: newUrl, loadReplace: true }))
			.catch(() => browser.tabs.update(tabId, { url: newUrl }))
			.catch((error) => console.error("[Neat URL]: could not clean " + changeInfo.url, error));
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
	browser.tabs.onUpdated.addListener(onTabUpdated, { properties: ["url"] });

	background.ensureState();

	NeatURL.firefox = { onBeforeRequest, onTabUpdated };
})(globalThis);
