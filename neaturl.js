function run(){
	if(enabled_2 == false){
		if(neat_url_logging) console.log("[Neat URL]: disabled on " + window.location.href);
		return;
	}

	if(neat_url_change_links_in_page){
		var linksOnPage = [...document.querySelectorAll("a")];
		for(var link of linksOnPage){
			if(!link.href.startsWith("http")) continue;

			link.href = cleanURL({url: link.href, type: "DOM"}).redirectUrl;

			if(neat_url_logging) console.log("[Neat URL]: content (DOM) rewrite to " + link.href);
		}
	}else{
		if(neat_url_logging) console.log("[Neat URL]: content (DOM) disabled on " + window.location.href);
	}
}

window.addEventListener("DOMContentLoaded", async (event) => {
	if (event.defaultPrevented) return;

	if(loadedPromise != null) await loadedPromise;
	run();
});
