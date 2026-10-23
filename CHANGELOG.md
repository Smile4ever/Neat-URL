7.0.0 (unreleased)
=====
* 6.0.0 and 6.1.0 were never officially released, so this contains all their changes (see below)
* Manifest V3 for Firefox and Chrome, fixes #291 (Chrome MV3) and #303 (Chromium)
    * Firefox 140 or newer: URLs are still cleaned with a blocking webRequest listener
    * Chrome 121 or newer: URLs are cleaned with declarativeNetRequest rules
    * Supported features per browser: see docs/browser-support.md
    * Firefox: the options page shows a button when Neat URL has no access to all websites
    * Tested with Firefox 140 ESR, 153 and 158 (#316) and Chrome 156
* New feature: keep signed URLs (sig, hmac, ...signature), fixes #314 and #315. On by default.
* New feature: clean URLs inside parameters, up to three levels deep (?url=https%3A%2F%2Fexample.com%2F%3Futm_source%3Dx). Off by default.
* New feature: parameters with a value, for example ref=share@amazon.com, fixes #183
* New feature: import and export of the preferences, fixes #175 and #301
* New feature: wildcards in the domain blacklist (archive.*, *.archive.*), fixes #286
* New feature: header lines ("Name:") in the parameter lists, fixes #285
* Change links in page: also cleans links that the page adds later, when they are used

* Updated default parameters
    * Removed assetId, assetType, campaignId, recipientId and siteId (Oracle Eloqua): too generic, fixes #299
    * Fixed ws_ab_test@*.aliexpress.com (the @ was missing)
    * cid was already removed in 6.0.0, which also fixes #307 and #308 (Google sign-in)
    * wt_zmc is removed from PDF links too (from TODO.md)

* Bugs fixed
    * Wildcard parameters such as utm_* were only partly removed (every second parameter was skipped), fixes #223 and #297
    * An exclusion (!sc_itemid) didn't work against a wildcard (sc_*), fixes #157
    * *.L3-domain.example.com didn't match L4-domain.L3-domain.example.com, fixes #143
    * t@www.youtube.com didn't work (a domain with www), fixes #262
    * A parameter without a value got a trailing =, fixes #147
    * The upgrade of the preferences ran on every start and removed custom parameters such as utm_source@example.com
    * Requests right after the browser starts (restored tabs) could fail while the preferences were loading
    * The toolbar button didn't work after saving the preferences
    * A root and suffix wildcard domain (*.aliexpress.*) didn't match subdomains like nl.aliexpress.com
    * Default parameters that were removed in Neat URL 4 no longer come back (they are added to the override list, or excluded if a wildcard covers them)
    * Suffix wildcards on short domains (x.*) didn't match
    * The domain blacklist matched parts of domain names (ample.com also excluded example.com)
    * Other parameters keep their encoding
    * Errors on the options page, and labels that pointed to the wrong option
    * "browser is not defined" in the content script on Chromium browsers (#269)
    * The upgrade from 5.0 or 6.x keeps the lines and headers of your parameter list

* Changes
    * Removed browser-polyfill and build.sh: build with npm run build, test with npm test and npm run test:e2e
    * Documentation in docs/ (browser support, architecture, development)
    * Translations for the new texts in all languages

6.1.0 (2024-09-?)
==================
* Since 6.0.0 was never officially released, this contains all changes from 6.0.0 and more
* Changes
    * Replace Promises by async/await code
    * Updated build script
    * Change homepage URL

6.0.0 (2022-02-07)
=====
* New feature: rewrite URLs before you click on them (change links in page), fixes #26 (copy clean URL) and #262 (URL rewriting in DOM)
    * This is disabled by default and can be enabled in the Options (under Advanced)
* New feature: fix #253 (clean 1Password littering of URLs): syntax KEY{length} added
* New feature: Fix #256 (remove all parameters): wildcard parameter * is now supported

* Updated default parameters
    * Fix #131 (add IMDb parameters)
    * Fix #145 (add guccounter@*.yahoo.com)
    * Inspired by #225 (investigate new parameters): added some rules
    * Fix #235 (TikTok rules): added rules
    * Fix #237 by #263 (add parameter ref_*@twitter.com)
    * Fix #241 (Linkedin email URLs): added numerous LinkedIn rules
    * Fix #246 (remove stm parameter): added parameter stm_*
    * Fix #250 (more parameters including at): added numerous parameters
    * Add parameter sc_cid (Adobe Analytics) (#230) 
    * Fix #181 (add Amazon ascsubtag parameter)
    * Fix #170 (add AliExpress parameters)
    * Added dpg_* used by DPG Media
    * Add mtm_* used by Matomo/Piwik

* Bugs fixed
    * Fix #258 (one letter parameter sometimes not blocked): this works as expected
    * Remove cid parameter, fixes #219, #226, #245, #251 and circumvents #248

* Changes 
    * LICENSE.md: Fix #155 and #260 (add GNU license)
    * README: updated default parameters
    * Options page: hide colorpicker for counter when default counter color is checked
    * Make more use of async/await code
    * Updated build script

Special thanks to the contributors who made this version possible.

5.0.0 (2020-04-26)
=====
* Fix #144 (XTOR): hash parameters work again
* Fix #161 (Ebay): add Ebay parameter hash@ebay.*
* Fix #167 (fbclid): add Facebook parameter fbclid
* Fix #176 (Google Analytics): add Google Analytics parameters gclid, gclsrc
* Fix #177 (merge commits) by updating this extension
* Fix #200 (double domains) by using publicsuffix-ccSLD
* Fix #204 (roadmap): consider this changelog to be the roadmap
* Fix #205 (block all placeholders using #*): add support for #* and #?*
* Fix #206 (Yandex parameters): added by default
* Fix #207 (hash): hash parameters work again
* Fix #216 (Matomo): add pk_*
* Fix #217 (outdated) by updating this extension
* Fix: mixing a root wild card domain with a suffix wildcard domain is now supported

* Adding default blocking parameters in new versions results in all users receiving the new parameters
    * Existing default parameters included in the custom blocked parameters, will be deleted from the custom blocked parameters list
* Organised default blocking parameters into categories and into a JSON file
    * This removes the need to have the default blocking list multiple times in the code base (options.js, background.js)

* Added Twitch.tv parameters tt_medium, tt_content
* Added MailChimp parameters mc_cid, mc_eid
* Added Google parameters gs_gbg@google.*, gs_mss@google.*, gs_rn@google.*, gs_lcp@google.*
* Added Google Analytics parameters gclid, gclsrc
* Added Amazon parameter pf@amazon.*
* Added AliExpress parameters algo_expid, algo_pvid, btsid, ws_ab_test
* Added Omniture tracking parameter s_cid
* Added Facebook parameters refsrc@facebook.com, hrc@facebook.com
* Added Yandex parameters lr@yandex.*, redircnt@yandex.*
* Added Ebay parameter hash@ebay.*
* Removed terminal_id, CNDID since the use is unknown
* Removed $/ref@amazon.* from the defaults due to suspected issues

* Options page: Add parameter rules URL
* Options page: Show default blocking parameters in a more organized way
* Options page: slightly adapt CSS styles

* README: update to the new default blocking parameters and use the new JSON format
* README: root wildcard domain and suffix wildcard domain can be combined; added an example
* README: organised "recommended parameters"
* README: added an explanation about addons.mozilla.org (related to #198)

4.1.5
=====
* Fix for item@jd.com

4.1.4
=====
* Port to Chrome
* Extract CSS into separate files

4.1.3
=====
* Add _hsmi

4.1.2
=====
* Remove ref, fixes #130

4.1.1
=====
* Add spm@*.aliexpress.com, scm@*.aliexpress.com, aff_platform, aff_trace_key and terminal_id, fixes #103

4.1.0
=====
* Add source@sourceforge.net, position@sourceforge.net, callback@bilibili.com, fixes #116
* Fix #97 revert counter color to default color
* Add eloqua tracking parameters #105
* Exception support #111
* Fix Neat URL breaks Google Product Forums #122
* Add ref, tag@amazon.*, ref_@amazon.* and pf_rd_*@amazon.* by default (fixes #118 #120 #125)
* Drop pd_rd_r@amazon.*, pd_rd_w@amazon.*, pd_rd_wg@amazon.* in favor of pd_rd_*@amazon.* (including automatic upgrade path)

4.0.1
=====
* Fix ending parameters not detected when there are no query or hash parameters
* Fix regression: Amazon product pages are not cleaned when not all parameters are included
* Remove unused method parameters passed to removeEndings function

4.0.0
=====
* Performance improvements
* Several encoding bugs fixed #73 #75 #93
* Re-initialise listener, hopefully fixes #92
* Fix "Show counter" setting (introduced in 3.2.0) doesn't do anything #91
* Workaround for gws_rd@google.* on google.com #76
* Implement hash parameters using #? #83
* Cleanups
* Fix translation string mapped to wrong i18n id 
* Move most functions related to the toolbar button to a separate file
* Automatically remove newlines from the Blocked parameters textarea when saving

3.2.0
=====
* Add counter which shows the number of rewritten URLs
* Add option to show/hide counter
* Add option to set the counter background color
* Fix addons.mozilla.org logic and change applyAfter to 1000ms
* Drop tracking feature introduced in 3.1.0
* Add blacklist feature to skip certain URLs
* Skip rewriting urls which contain ??
* Empty list of request types now means no request types are filtered at all

3.1.1
=====
* Fix handling of addons.mozilla.org again, browser.tabs.update triggers a new request, catch that
* Change applyAfter from 400ms to 300ms on addons.mozilla.org

3.1.0
=====
* Fix some websites breaking / problems caused by the use of URL() constructor #52
* Default request filter will now only filter "main_frame" requests - see the advanced section of the options to change that (tip: if you want all requests to be filtered, you can use an empty value - it might break some sites, so make sure you report all URLs which do not work in this mode). #48 #52 livejournal.com
* Safer handling of addons.mozilla.org - only main_frame requests will be changed to prevent issues. #48
* Added tracking protection - it will cancel requests to listed domains
* Expanded existing localisations
* Explicit support for stripping of # parameters
* Fix double dollar support

3.0.0
=====
* Fix notification theme not respected the first time you click Save preferences when it is different from the default icon theme
* Add utm_name, utm_pubreferrer, utm_swu, utm_viz_id to Neat URL defaults #43
* Add hmb_campaign, hmb_medium, hmb_source to Neat URL defaults #43
* Do not remove hash fragments #47
* Implement wildcards at the end of the parameter (but before the domain @ sign). For example, utm_*
* Fix bug in changed=false logic
* Allow logging the changed URLs to the console #36
* Add localisation system. The Dutch localisation is already included.
* Expanded README with extra parameters #43
* Ignore utm.gif links

2.1.2
=====
* Fix problem with URL decoding
* Keys are now case sensitive

2.1.1
=====
* Do not update a tab to an empty URL

2.1.0
=====
* Fix handling of addons.mozilla.org and mozilla.org again
* On Amazon product pages, all parameters are removed
* Add light icons for dark themes, can be set in the options

2.0.5
=====
* Fix handling of mozilla.org

2.0.4
=====
* Fix problem related to Google Docs - see https://addons.mozilla.org/nl/firefox/addon/neat-url/reviews/918997/
* Add _hsenc and mkt_tok to Neat URL defaults

2.0.3
=====
* Important bugfix preventing some users from getting upgraded parameters

2.0.2
=====
* Add utm_cid for mashable.com

2.0.1
=====
* Introduce $$ to force remove everything after a certain string
* Change $ behaviour to remove everything after a certain string only if there are no query parameters after reducing the query parameters (no longer breaks Amazon links)
* Drop utils/compareVersions.js (no longer needed)

2.0.0
=====
* Added domain wildcards
* Added support for anchor tags
* Made upgrading of parameters between versions more robust
* Fixed context menu listeners staying attached after removing them
* Add gs_l parameter retroactively
* Add new default parameters: pd_rd_r@amazon.*, pd_rd_w@amazon.*, pd_rd_wg@amazon.*, _encoding@amazon.*, psc@amazon.*, ved@google.*, ei@google.*, sei@google.*, gws_rd@google.*, cvid@bing.com, form@bing.com, sk@bing.com, sp@bing.com, sc@bing.com, qs@bing.com, pq@bing.com, feature@youtube.com, gclid@youtube.com, kw@youtube.com, $/ref@amazon.*
* Expanded README

1.2.0
=====
- Fix options.js resizing of textarea width under certain conditions
- Add parameter gs_l and provide an automatic upgrade path for users using earlier versions

1.1.0
=====
- Support for addons.mozilla.org - try https://addons.mozilla.org/firefox/addon/google-pdf-viewer/?src=search after adding src@addons.mozilla.org to parameters in the options page
- Fix support for google.co.uk (double domains)
- Introduce support for root domains with subdomains. This means you can use wildcards at the beginning of a parameter (*.mozilla.org)

1.0.1
=====
- Added utm_userid as default parameter

1.0.0
=====
- Fork of Lean URL, with features from Pure URL
- Added ability to set your own URL parameters on the options page (to reach feature parity with Pure URL)
- Fixed version of Lean URL, works with recent Firefox versions
- Added a nice animation in the toolbar (can be changed or disabled)
- Added domain-specific blocked parameters (to reach feature parity with Pure URL)
