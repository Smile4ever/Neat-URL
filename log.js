// Shows the log of cleaned URLs (kept by src/background/common.js in storage.session)
globalThis.browser = globalThis.browser || globalThis.chrome;

const LOG_KEY = "neat_url_log";
let entries = [];

function element(tag, className, text){
	let node = document.createElement(tag);
	if(className) node.className = className;
	if(text != undefined) node.textContent = text;
	return node;
}

// "?a=1&b=2" with everything that is not in kept marked as removed: the parameters,
// the & between them, and the ? (or #) itself when no parameter is left
function appendParts(parent, separator, original, kept){
	let remaining = kept == "" ? [] : kept.split("&");
	let parts = original.split("&");
	let isKept = parts.map((part) => {
		let found = remaining.indexOf(part);
		if(found < 0) return false;
		remaining.splice(found, 1);
		return true;
	});

	let anyKept = isKept.includes(true);
	parent.appendChild(anyKept ? document.createTextNode(separator) : element("del", null, separator));

	let keptSoFar = 0;
	parts.forEach((part, index) => {
		let ampersand = index > 0 ? "&" : "";
		if(isKept[index]){
			// The & before the first kept parameter belongs to the removed parameters before it
			if(ampersand) parent.appendChild(keptSoFar > 0 ? document.createTextNode(ampersand) : element("del", null, ampersand));
			parent.appendChild(document.createTextNode(part));
			keptSoFar++;
		}else{
			parent.appendChild(element("del", null, ampersand + part));
		}
	});
}

// The original URL with the removed parameters struck through
function renderOriginal(original, cleaned){
	let line = element("div", "original");
	let o, c;
	try{
		o = new URL(original);
		c = new URL(cleaned);
	}catch(ex){
		line.textContent = original;
		return line;
	}

	if(o.origin + o.pathname != c.origin + c.pathname){
		// An ending rule changed the path: show the part that was cut off
		let base = c.origin + c.pathname.replace(/\/$/, "");
		if(original.startsWith(base)){
			line.appendChild(document.createTextNode(base));
			line.appendChild(element("del", null, original.substring(base.length)));
		}else{
			line.textContent = original;
		}
		return line;
	}

	line.appendChild(document.createTextNode(o.origin + o.pathname));
	if(o.search != "") appendParts(line, "?", o.search.substring(1), c.search.substring(1));
	if(o.hash != "") appendParts(line, "#", o.hash.substring(1), c.hash.substring(1));
	return line;
}

function formatTime(time){
	let date = new Date(time);
	let today = new Date().toDateString() == date.toDateString();
	return today ? date.toLocaleTimeString() : date.toLocaleString();
}

function render(){
	let filter = document.querySelector("#filter").value.trim().toLowerCase();
	let shown = entries.filter((entry) => filter == "" || entry.url.toLowerCase().includes(filter) || entry.cleaned.toLowerCase().includes(filter));

	let tbody = document.querySelector("#log tbody");
	tbody.replaceChildren();
	for(let entry of shown.slice().reverse()){
		let row = element("tr");
		row.appendChild(element("td", "time", formatTime(entry.time)));
		row.appendChild(element("td", "type", entry.type));

		let url = element("td", "url");
		url.appendChild(renderOriginal(entry.url, entry.cleaned));
		url.appendChild(element("div", "cleaned", entry.cleaned));
		row.appendChild(url);
		tbody.appendChild(row);
	}

	document.querySelector("#log").hidden = shown.length == 0;
	document.querySelector("#empty").hidden = shown.length > 0;
}

async function load(){
	let result = await browser.storage.session.get(LOG_KEY);
	entries = result[LOG_KEY] || [];
	render();
}

function i18n(){
	for(let node of document.querySelectorAll("[data-i18n]")){
		let message = browser.i18n.getMessage(node.getAttribute("data-i18n"));
		if(message != "") node.textContent = message;
	}
	for(let node of document.querySelectorAll("[data-i18n-placeholder]")){
		let message = browser.i18n.getMessage(node.getAttribute("data-i18n-placeholder"));
		if(message != "") node.placeholder = message;
	}
	document.title = "Neat URL - " + browser.i18n.getMessage("show_log");
}

i18n();
load();

browser.storage.onChanged.addListener((changes, area) => {
	if(area != "session" || !(LOG_KEY in changes)) return;
	entries = changes[LOG_KEY].newValue || [];
	render();
});
document.querySelector("#filter").addEventListener("input", render);
document.querySelector("#clear").addEventListener("click", () => browser.storage.session.remove(LOG_KEY));
