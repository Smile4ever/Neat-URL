const PREFS = {
	"neat_url_override_default_blocked_params": {
		"type": "value",
		"default": ""
	},
	"neat_url_blocked_params": {
		"type": "value",
		"default": ""
	},
	"neat_url_icon_animation": {
		"type": "value",
		"default": "missing_underscore"
	},
	"neat_url_icon_theme": {
		"type": "value",
		"default": "dark"
	},
	"neat_url_show_counter": {
		"type": "checked",
		"default": true
	},
	"neat_url_counter_color": {
		"type": "value",
		"default": "#eeeeee"
	},
	"neat_url_logging": {
		"type": "checked",
		"default": false
	},
	"neat_url_blacklist": {
		"type": "value",
		"default": ""
	},
	"neat_url_types": {
		"type": "value",
		"default": "main_frame"
	},
	"neat_url_counter_default_color": {
		"type": "checked",
		"default": true
	}
};
var lastWidth = 0;
var rendered = false;

function getClean(text){
	let clean = text.split(",");

	for(let i = 0; i < clean.length; i++){
		clean[i] = clean[i].trim();
	}

	return clean;
}

async function saveOptions() {
	const values = {};
	for(let p in PREFS) {
		values[p] = document.querySelector("#"+p)[PREFS[p].type];
	}

	browser.storage.local.set(values).then(() => {
		browser.runtime.sendMessage({action: "refresh-options"});

		setTimeout(function(){
			browser.runtime.sendMessage({action: "notify", data: browser.i18n.getMessage("notify_preferences_saved")});
		}, 10);
	});
}

async function restoreOptions() {
	fetch('data/default-params-by-category.json').then((response) => {
		return response.json();
	}).then((jsonParams) => {
		let categories = jsonParams.categories;
		let lines = categories.map(cat => cat.name + ":\n" + cat.params.join(', '));
		document.getElementById("neat_url_default_blocked_params")["value"] = lines.join("\n\n");
	});

	browser.storage.local.get(Object.keys(PREFS)).then((result) => {
		let val;
		for(let p in PREFS) {
			if(p in result) {
				val = result[p];
			}
			else {
				val = PREFS[p].default;
			}

			//console.log("options.js val restored for " + p + " is", val);
			document.getElementById(p)[PREFS[p].type] = val;
		}
	}).catch(console.error);
}

function i18n() {
	let i18nElements = document.querySelectorAll('[data-i18n]');

	for(let i in i18nElements){
		try{
			if(i18nElements[i].getAttribute == null)
				continue;
			i18n_attrib = i18nElements[i].getAttribute("data-i18n");
			let message = browser.i18n.getMessage(i18n_attrib);
			if(message.includes("<") && message.includes(">")){
				i18nElements[i].innerHTML = message;
			}else{
				i18nElements[i].textContent = message;
			}
		}catch(ex){
			console.error("i18n id " + IDS[id] + " not found");
		}
	}
}

async function init(){
	render();
	useCorrectStylesheet();
	restoreOptions();
	i18n();
	document.querySelector("form").style.display = "block";
	document.querySelector(".refreshOptions").style.display = "none";
}

function render(){
	if(rendered === false){
		return; // do not render again
	}

	rendered = true;

	let sheet = document.styleSheets[0];

	// https://stackoverflow.com/questions/29927992/remove-css-rules-by-javascript
	if (sheet.cssRules) {
		for (let i = 0; i < sheet.cssRules.length; i++) {
			if (sheet.cssRules[i].selectorText === '.labelbox') {
				sheet.deleteRule(i);
			}
		}
	}

	let cssRule = ".labelbox{ min-width: " + newWidth + "px;}";
	sheet.insertRule(cssRule, 1);
	lastWidth = newWidth;
}

function useCorrectStylesheet(){
	let userAgent = navigator.userAgent;
	let b = "";
	if(userAgent.includes("Firefox")){
		b = "firefox";
	}
	if(userAgent.includes("Chrome")){
		b = "chrome";
	}
	
	let styles = document.createElement('link');
	styles.rel = "stylesheet";
	styles.type = "text/css";
	styles.media = "screen";
	styles.href = "css/options." + b + ".css";
	document.getElementsByTagName('head')[0].appendChild(styles);
}

window.addEventListener("DOMContentLoaded", init, { passive: true });
document.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); saveOptions(); }, { passive: false });
window.addEventListener("resize", render);
