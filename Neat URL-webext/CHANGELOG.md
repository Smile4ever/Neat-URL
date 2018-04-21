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
