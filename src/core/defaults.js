// Default values for all preferences. Shared by the background scripts and the options page,
// so there is only one place where a default is defined.
(function(root){
	"use strict";
	const NeatURL = root.NeatURL = root.NeatURL || {};

	const PREFS = {
		"neat_url_use_default_params": { "type": "checked", "default": true }, // false: only the user's own parameters, also none that a new version adds
		"neat_url_override_default_blocked_params": { "type": "value", "default": "" },
		"neat_url_blocked_params": { "type": "value", "default": "" },
		"neat_url_icon_animation": { "type": "value", "default": "missing_underscore" }, // none, missing_underscore, rotate or surprise_me
		"neat_url_icon_theme": { "type": "value", "default": "auto" }, // auto, dark or light
		"neat_url_show_counter": { "type": "checked", "default": true },
		"neat_url_counter_color": { "type": "value", "default": "#eeeeee" },
		"neat_url_counter_default_color": { "type": "checked", "default": true },
		"neat_url_clean_nested": { "type": "checked", "default": false },
		"neat_url_keep_signed_urls": { "type": "checked", "default": true },
		"neat_url_remove_text_fragments": { "type": "checked", "default": false }, // #:~:text=, see clean.js
		"neat_url_change_links_in_page": { "type": "checked", "default": false },
		"neat_url_websites": { "type": "value", "default": "all_except" }, // all_except: all websites except neat_url_blacklist, only: only neat_url_whitelist
		"neat_url_blacklist": { "type": "value", "default": "" },
		"neat_url_whitelist": { "type": "value", "default": "" },
		"neat_url_types": { "type": "value", "default": "main_frame" }
	};

	// The default blocked parameters of Neat URL 4.x. In 4.x these were stored as part of
	// neat_url_blocked_params, so the 5.0 migration needs them to tell user additions apart from defaults.
	const VERSION_4_DEFAULT_PARAMS = ["utm_source", "utm_medium", "utm_term", "utm_content", "utm_campaign", "utm_reader", "utm_place", "utm_userid", "utm_cid", "utm_name", "utm_pubreferrer", "utm_swu", "utm_viz_id", "ga_source", "ga_medium", "ga_term", "ga_content", "ga_campaign", "ga_place", "yclid", "_openstat", "fb_action_ids", "fb_action_types", "fb_ref", "fb_source", "action_object_map", "action_type_map", "action_ref_map", "gs_l", "pd_rd_*@amazon.*", "_encoding@amazon.*", "psc@amazon.*", "ved@google.*", "ei@google.*", "sei@google.*", "gws_rd@google.*", "cvid@bing.com", "form@bing.com", "sk@bing.com", "sp@bing.com", "sc@bing.com", "qs@bing.com", "pq@bing.com", "feature@youtube.com", "gclid@youtube.com", "kw@youtube.com", "$/ref@amazon.*", "_hsenc", "mkt_tok", "hmb_campaign", "hmb_medium", "hmb_source", "source@sourceforge.net", "position@sourceforge.net", "callback@bilibili.com", "elqTrackId", "elqTrack", "assetType", "assetId", "recipientId", "campaignId", "siteId", "tag@amazon.*", "ref_@amazon.*", "pf_rd_*@amazon.*", "spm@*.aliexpress.com", "scm@*.aliexpress.com", "aff_platform", "aff_trace_key", "terminal_id", "_hsmi", "fbclid", "spReportId", "spJobID", "spUserID", "spMailingID", "utm_mailing", "utm_brand", "CNDID", "mbid", "trk", "trkCampaign", "sc_campaign", "sc_channel", "sc_content", "sc_medium", "sc_outcome", "sc_geo", "sc_country", "wt_zmc"];

	function getDefaultPrefs(){
		let result = {};
		for(let p in PREFS) result[p] = PREFS[p].default;
		return result;
	}

	// Only known preferences with the right type, for an import or the synchronized preferences
	function validPrefs(values){
		let result = {};
		if(values == null || typeof values != "object") return result;
		for(let p in PREFS){
			let expected = PREFS[p].type == "checked" ? "boolean" : "string";
			if(p in values && typeof values[p] == expected) result[p] = values[p];
		}
		return result;
	}

	NeatURL.defaults = { PREFS, VERSION_4_DEFAULT_PARAMS, getDefaultPrefs, validPrefs };
	if(typeof module === "object" && module.exports) module.exports = NeatURL.defaults;
})(globalThis);
