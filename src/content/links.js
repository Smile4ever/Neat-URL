// Option "Change links in page": removes blocked parameters from links in the page, so a copied link is clean too.
// Links are cleaned when the page has loaded, and again just before they are used (click, middle click,
// context menu, keyboard), which also covers links that the page adds later.
globalThis.browser = globalThis.browser || globalThis.chrome;

(function(root){
	"use strict";
	const NeatURL = root.NeatURL;
	const LINKS = "a[href], area[href]";
	let settings = null;

	function cleanLink(link){
		if(!/^https?:/i.test(link.href)) return;
		let cleaned = NeatURL.clean.cleanUrl(link.href, settings.config);
		if(cleaned == link.href) return;
		if(settings.logging) console.log("[Neat URL]: link changed to " + cleaned);
		link.href = cleaned;
	}

	function cleanAllLinks(){
		for(let link of document.querySelectorAll(LINKS)) cleanLink(link);
	}

	function onUse(event){
		let link = event.target instanceof Element ? event.target.closest(LINKS) : null;
		if(link) cleanLink(link);
	}

	async function init(){
		// Most users don't use this option: don't ask the background on every page
		let stored = await browser.storage.local.get(["neat_url_change_links_in_page", "neat_url_enabled"]);
		if(!stored.neat_url_change_links_in_page || stored.neat_url_enabled === false) return;

		settings = await browser.runtime.sendMessage({ action: "get-config" });
		if(!settings || !settings.enabled || !settings.changeLinks) return;
		settings.config.suffixSet = new Set(settings.config.suffixList);

		// Not on blacklisted websites
		let hostInfo = NeatURL.domain.splitHost(location.hostname, settings.config.suffixSet);
		if(NeatURL.domain.isBlacklisted(hostInfo, settings.config.blacklist)) return;

		for(let type of ["mousedown", "auxclick", "contextmenu", "keydown", "focusin", "touchstart"]){
			document.addEventListener(type, onUse, { capture: true, passive: true });
		}
		if(document.readyState == "loading") document.addEventListener("DOMContentLoaded", cleanAllLinks, { once: true });
		else cleanAllLinks();
	}

	// The page can be gone before the background answers
	init().catch(() => {});
})(globalThis);
