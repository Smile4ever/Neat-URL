# Browser support

Neat URL 7 is a Manifest V3 extension for Firefox and Chrome. Both versions use the same parameter rules and the same preferences, but they clean URLs in a different way:

| | Firefox | Chrome |
|---|---|---|
| Minimum version | Firefox 140 (ESR 140) | Chrome 121 |
| How URLs are cleaned | Neat URL's own code checks every request (blocking `webRequest`) and redirects to the clean URL | Neat URL turns the preferences into `declarativeNetRequest` rules; the browser applies them itself |
| Tested with | Firefox 140 ESR, 153, 153 ESR and 158 | Chrome 156 (Chrome for Testing) |

## Features

✅ supported · ⚠️ supported with a limitation (see the notes) · ❌ not supported · — not applicable

| Feature | Firefox | Chrome | Notes |
|---|:-:|:-:|---|
| Global parameters (`fbclid`) | ✅ | ✅ | |
| Wildcard parameters (`utm_*`) | ✅ | ✅ | Chrome removes them with a short chain of internal redirects. |
| All parameters (`*@example.com`) | ✅ | ✅ | Together with an exclusion: see [2]. |
| Parameter with a value (`ref=share@amazon.com`) | ✅ | ✅ | |
| Parameter name length (`KEY{11}`) | ✅ | ✅ | Together with an exclusion: see [2]. |
| Domain parameters (`param@example.com`) | ✅ | ✅ | Matches `example.com` and `www.example.com`. |
| Root wildcard domain (`param@*.example.com`) | ✅ | ✅ | |
| Suffix wildcard domain (`param@google.*`) | ✅ | ⚠️ | [1] |
| Root and suffix wildcard (`param@*.google.*`) | ✅ | ⚠️ | [1] |
| Exclusions (`!param`, `!param@example.com`) | ✅ | ⚠️ | [2] |
| Hash parameters (`#?pk_campaign`, `#?pk_*`) | ⚠️ | ⚠️ | [3] |
| Exact hash (`#xtor=RSS-8`) | ⚠️ | ⚠️ | [3] |
| Remove the whole hash (`#*`, `#?*`) | ⚠️ | ⚠️ | [3] |
| Ending parameters (`$/ref@amazon.*`, `$$/ref`) | ✅ | ✅ | |
| Header lines in the parameter lists (`Name:`) | ✅ | ✅ | |
| Default parameters and override list | ✅ | ✅ | |
| Domain blacklist, also with wildcards (`archive.*`) | ✅ | ✅ | |
| Keep signed URLs | ✅ | ✅ | |
| Clean URLs inside parameters | ✅ | ⚠️ | [7] |
| Change links in page | ✅ | ✅ | Links that the page adds later are cleaned when they are used (click, middle click, context menu, keyboard). These changes are not counted. |
| URL request types | ✅ | ⚠️ | [4] |
| Counter | ✅ | ✅ | Chrome counts a cleaned navigation once, even when it took several internal redirects. |
| Counter color | ✅ | ✅ | |
| Icon animation | ✅ | ✅ | |
| Icon theme | ✅ | ✅ | |
| Enable/disable with the toolbar button | ✅ | ✅ | Neat URL is enabled again after a browser restart. |
| Logging to the console | ✅ | ⚠️ | [5] |
| Import and export of the preferences | ✅ | ✅ | |
| Links to addons.mozilla.org | ⚠️ | — | [6] |
| Chrome Web Store pages | — | ❌ | [6] |
| Other parameters keep their encoding | ✅ | ✅ | `?q=a+b%20c&flag` stays like that; only the removed parameters disappear. |
| `gws_rd=cr` kept on google.com | ✅ | ✅ | Workaround for [firefoxaddons#76](https://github.com/Smile4ever/firefoxaddons/issues/76). |

### Notes

1. **Suffix wildcard domains in Chrome.** Firefox uses the public suffix list in `data/publicsuffix-ccSLD.txt`, so `google.*` matches `google.com` and `google.co.uk`, but not `google.example.com`. Chrome rules can only use a pattern: it accepts any suffix of one label, or two labels of two or three letters (like `co.uk`). So in Chrome `amazon.*` also matches a host like `amazon.foo.com`. In practice that only matters for sites that use such a host name.

2. **Exclusions in Chrome.** A Chrome rule can't skip one specific parameter. Neat URL handles that in two ways:
   * A wildcard with an exclusion (`!utm_source@example.com` with the default `utm_*`): on that domain Chrome removes a fixed list of known `utm_` parameters (from the Neat URL 4 defaults, plus your own exact parameters) instead of every parameter that starts with `utm_`.
   * `*`, `KEY{n}` or a parameter with a value, together with an exclusion that overlaps it (`*@example.com, !id@example.com`): Neat URL loads the clean URL in the tab right after the navigation started, like for [7]. This only works for pages, not for other request types.

3. **Hash parameters** are only cleaned when the browser loads a page. When a page changes its own hash, or you click a link to `#something` on the same page, there is no request, so neither browser can clean it.

4. **URL request types in Chrome.** Chrome knows fewer request types. Firefox-only types are mapped: `imageset` → `image`, `beacon` → `ping`, `object_subrequest` → `object`, and `xslt`, `xml_dtd`, `web_manifest` → `other`. Unknown types are ignored. In Firefox, Neat URL checks the type itself.

5. **Logging in Chrome.** The log is in the console of the service worker (`chrome://extensions` → Neat URL → "service worker"). It shows each cleaned navigation with the URL after the first internal redirect, plus the number of active rules after every change of the preferences.

6. **Restricted sites.** Browsers don't let extensions change requests to their own add-on stores. In Firefox, Neat URL works around this for addons.mozilla.org: it updates the tab with the clean URL after the page has started loading. To clean other Mozilla domains, change `extensions.webextensions.restrictedDomains` in `about:config`. Chrome has no such workaround for the Chrome Web Store.

7. **URLs inside parameters** (off by default). When a parameter value is a URL itself (encoded or not, with or without `https://`), Neat URL also cleans that URL with the rules of its own domain, up to three levels deep. It is off by default because some sites check that such a link was not changed, for example login redirects. In Firefox the URL is cleaned before the request is sent. Chrome rules can't decode and encode a value, so in Chrome Neat URL loads the clean URL in the tab right after the navigation started: the request for the original URL has started by then, and in the end the clean page is shown.

## Other browsers and platforms

| Browser | Status |
|---|---|
| Edge, Brave, Opera, Vivaldi and other Chromium-based browsers | They use the Chrome version. Not tested. |
| Firefox for Android | Not tested. Firefox for Android supports Manifest V3 and blocking `webRequest`, so the Firefox version may work, but the options page and toolbar button are not made for it. |
| Edge Canary (Android) | Not possible yet: Neat URL is not in the Microsoft Edge Add-ons store. Edge Canary can install most extensions from the Microsoft Edge Add-ons store: go to Settings → About Microsoft Edge and tap the build number 5 times to turn on the developer options. Choose "Extension install by id", then paste the ID from the extension's URL in the Edge Add-ons store (for Bitwarden: `jbkfoedolllekgbhcbcoahefnbanhhlh`). |
| Thunderbird | Not supported. Thunderbird has other APIs for messages; links in messages open in the browser, where Neat URL works. |

## Permissions

| Permission | Firefox | Chrome | Why |
|---|:-:|:-:|---|
| Access to all websites (`<all_urls>`) | ✅ | ✅ | To clean URLs on every website. |
| `webRequest` | ✅ | ✅ | Firefox: clean URLs. Chrome: observe the redirects of the rules, for the counter, animation and logging, and the cases of [2] and [7]. |
| `webRequestBlocking` | ✅ | — | Firefox: change a request before it is sent. |
| `declarativeNetRequestWithHostAccess` | — | ✅ | Chrome: the rules that clean URLs. |
| `storage` | ✅ | ✅ | Preferences, counter. |
| `tabs` | ✅ | ✅ | Counter per tab, the addons.mozilla.org workaround, and the cases of [2] and [7] in Chrome. |
| `contextMenus` | ✅ | ✅ | "Preferences" in the menu of the toolbar button. |
| `notifications` | ✅ | ✅ | "Saved preferences" notification. |

Neat URL also has a content script on every page, for the option "Change links in page". When the option is off, it only reads that option and stops.

In Firefox, you can turn off access to all websites in the add-on manager. Neat URL then can't clean anything, and the options page shows a button to allow access again.

## Limits in Chrome

Chrome limits the number of rules: at most 1000 rules with a regular expression, and at most 2 KB of memory per regular expression. With the default parameters Neat URL uses about 260 rules. When Chrome rejects a regular expression because it is too big, Neat URL creates the rules again with fewer alternatives per rule. A rule that Chrome still doesn't accept is skipped and logged, so one bad rule doesn't stop the others. Very long lists of your own domain parameters may reach the limit.

## How this is tested

* `npm test` runs the test cases in `test/cases.json` against the Firefox engine, and against a simulation of the Chrome rules.
* `npm run test:e2e` loads both builds in a real Firefox and Chrome and checks every test case with a local HTTPS server. See [development.md](development.md).
