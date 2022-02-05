browser.runtime.onMessage.addListener((message) => {
	switch(message.action){
		case "aMessage": 
			//doSomething();
			break;
		default:
			break;
	}
});

window.addEventListener("DOMContentLoaded", (event) => {
	if (event.defaultPrevented)
		return;

	var linksOnPage = [...document.querySelectorAll("a")];
	for(var link of linksOnPage){
		if(!link.href.startsWith("http")) continue;
		
		link.href = cleanURL({url: link.href, type: "DOM"}).redirectUrl;

		if(neat_url_logging) console.log("[Neat URL]: content (DOM) rewrite to " + link.href);
	}
});
