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
