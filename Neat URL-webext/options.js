const PREFS = {
	"neat_url_blocked_params": {
		"type": "value",
		"default": "utm_source, utm_medium, utm_term, utm_content, utm_campaign, utm_reader, utm_place, utm_userid, ga_source, ga_medium, ga_term, ga_content, ga_campaign, ga_place, yclid, _openstat, fb_action_ids, fb_action_types, fb_ref, fb_source, action_object_map, action_type_map, action_ref_map"
	},
	"neat_url_icon_animation": {
		"type": "value",
		"default": "missing_underscore"
	}
};

function saveOptions() { 
	browser.runtime.sendMessage({action: "notify", data: "Saved preferences"});
	
	const values = {};
	for(let p in PREFS) {
		values[p] = document.getElementById(p)[PREFS[p].type];
	}

	browser.storage.local.set(values).then(() => browser.runtime.sendMessage({action: "refresh-options"}));
}

function restoreOptions() {
	browser.storage.local.get(Object.keys(PREFS)).then((result) => {
		let val;
		for(let p in PREFS) {
			if(p in result) {
				val = result[p];
			}
			else {
				val = PREFS[p].default;
			}
			document.getElementById(p)[PREFS[p].type] = val;
			console.log("options.js val restored is " + val);
		}
	}).catch(console.error);
}

function init(){
	render();
	restoreOptions();
	document.querySelector("form").style.display = "block";
	document.querySelector(".refreshOptions").style.display = "none";
}

function render(){
	var sheet = document.styleSheets[0];
	
	// https://stackoverflow.com/questions/29927992/remove-css-rules-by-javascript
	if (sheet.cssRules) {
		for (var i = 0; i < sheet.cssRules.length; i++) {
			if (sheet.cssRules[i].selectorText === '.labelbox') {        
				sheet.deleteRule(i);
			}
		}
	}
	
	var width = document.documentElement.clientWidth;
	var cssRule = ".labelbox{ min-width: " + width / 3 + "px;}";
	
	sheet.insertRule(cssRule, 1);
}

window.addEventListener("DOMContentLoaded", init, { passive: true });
document.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); saveOptions(); }, { passive: false });
window.addEventListener("resize", render);
