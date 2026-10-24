# Architecture

Neat URL has one shared core that understands the parameter rules, and two engines that apply them: one for Firefox and one for Chrome.

```
src/core/                     shared, no browser APIs (also runs in Node for the tests)
  defaults.js                 default preferences, Neat URL 4 default parameters
  domain.js                   host names and domain patterns (example.com, *.example.com, google.*, *.google.*)
  params.js                   parses the parameter rules into a config
  clean.js                    cleanUrl(url, config): the Firefox engine and the reference behaviour
  dnr.js                      compileDnrRules(config): the Chrome engine
  migrate.js                  migration of stored preferences between versions
src/background/
  common.js                   state, counter, icon animation, toggle, context menu
  firefox.js                  blocking webRequest listener
  chrome.js                   installs the declarativeNetRequest rules, observes their redirects
  chrome-sw.js                service worker entry point (importScripts)
src/content/
  links.js                    option "Change links in page"
log.js                        the Log tab of the options page
manifest.json                 works in both browsers; scripts/build.js makes one per browser
options.html, options.js      options page in its own tab, with the tabs #preferences, #appearance, #advanced and #log
data/                         default parameters, public suffixes
```

## Background lifecycle

Both browsers use a non-persistent background in Manifest V3: a Firefox event page and a Chrome service worker. The browser can stop it at any time. Therefore:

* All listeners are registered synchronously when the script starts.
* The preferences are loaded once into a state object (`ensureState()`) and reloaded on `storage.onChanged`. The options page only writes to `storage.local`.
* The options page has its own language picker (`neat_url_language` in `storage.local`, not part of the exported preferences). `browser.i18n` always uses the language of the browser, so for another language `options.js` loads `_locales/<language>/messages.json` and fills in the placeholders itself (`message()`); `log.js` uses the same function. The menu of the toolbar button still uses the language of the browser.
* The options page keeps changes in the form until Save (or Ctrl+S). It compares the form with `storage.local` to show the save bar and warns before the tab is closed with unsaved changes. "Test a URL" runs `cleanUrl()` in the options page with the values of the form, so it also works before saving. The checkboxes of the default parameters write the override list (`neat_url_override_default_blocked_params`), which is a hidden field on the page. The switch "Use the default blocked parameters" (`neat_url_use_default_params`) leaves out all defaults in `compileConfig()` and keeps the override list. When the preferences remove no parameter at all, the options page shows a warning, and turning off the defaults without own parameters asks for confirmation first.
* The counter per tab is kept in `storage.session`, and the on/off state (the checkbox "Enabled" in the menu of the toolbar button) in `storage.local` (reset to "on" by `runtime.onStartup`).
* Migration of stored preferences runs while the state loads, and only when `neat_url_version` is lower than the current version.

## Firefox engine

`firefox.js` registers one blocking `webRequest.onBeforeRequest` listener for all request types. Firefox needs the listener before the preferences are known, so the listener checks `neat_url_types` itself. When the state is loaded, the listener is synchronous. Right after the background starts, the listener returns a promise that waits for the state, so early requests (for example restored tabs) are cleaned too.

`cleanUrl()` removes parameters by working on the raw query string, so other parameters keep their exact encoding. It leaves blacklisted domains, domains outside the whitelist (if it is not empty) and signed URLs alone. Only one of the two lists is used: `compileConfig()` leaves the other one empty, depending on the option Websites (`neat_url_websites`). With the option "Clean URLs inside parameters", a parameter value that is a URL itself is decoded, cleaned with `cleanUrl()` (up to three levels deep) and encoded again in the same style.

## Chrome engine

Chrome Manifest V3 has no blocking `webRequest`, so `dnr.js` compiles the config to `declarativeNetRequest` dynamic rules. `chrome.js` installs them whenever the state changes (only if they differ from the installed rules), and checks every regular expression with `isRegexSupported()` first. When Chrome rejects a regular expression because it uses too much memory, `chrome.js` compiles the rules again with fewer alternatives per rule (6, then 3, then 1).

### What Chrome does with the rules

Verified in Chrome 156 with a test extension, and covered by the end-to-end tests:

1. For a request, Chrome applies one action: the matching rule with the highest priority.
2. A redirected request goes through the rules again, so rules can work in a chain.
3. A redirect that results in the same URL does nothing. Chrome picks the highest rule separately for rules with a `urlFilter` and rules with a `regexFilter`. So a "no change" redirect stops the lower rules of the same kind, but not the rules of the other kind.
4. The rules see the fragment (`#...`) of a navigation, and a redirect without a fragment removes it.
5. `regexSubstitution` replaces the match; capture groups are `\1`, `\2`, ...
6. A compiled regular expression may use at most 2 KB of memory (with capture groups).
7. A non-blocking `webRequest.onBeforeRedirect` listener sees the first redirect of a navigation (status 307, "Internal Redirect").

### Rule layout

Every domain pattern (plus a global pattern) gets a set of rules. A pattern contains the parameters of all broader patterns that cover it, so for any host the most specific pattern has everything that applies. Partly overlapping patterns get an extra pattern for the overlap (`*.example.com` and `example.*` overlap on `example.com`).

The priority of a rule is `band + rank × 10 + kind`. The rank is the number of patterns that cover the pattern, so a more specific pattern has a higher rank. There are three bands:

* 0: the rules of kind 0 to 3 of every pattern, with the entries of the pattern and of all broader patterns.
* 1000: the rules of kind 4 to 6 of every pattern, with only the entries of the pattern itself. They only match when they change the URL, so they can stay above the union rules of all narrower patterns, and a global wildcard like `utm_*` needs rules only once instead of once per domain pattern.
* 2000: a pattern with an exclusion that overlaps a wildcard, value or name length of the merged entries (for example `!utm_source@example.com`), and every pattern below it, gets all its rules here with the merged entries. Its allow rule stops the band 1000 rules of broader patterns, which would remove the excluded parameter.

| Kind | Rule | Matches |
|---:|---|---|
| 6 | ending (`$/ref`) | only if the token is in the path |
| 5 | hash parameters / exact hash / whole hash | only if there is something to remove |
| 4 | wildcards (`utm_*`), values (`ref=share`) and name lengths (`KEY{n}`): 3 regexes (last parameter, leading run, later run); `*`: remove the query | only if such a parameter is present |
| 3 | `gws_rd=cr` on google.com: remove the other parameters | only if `gws_rd=cr` is present |
| 2 | `gws_rd=cr` on google.com: allow | only if `gws_rd=cr` is present |
| 1 | union: `removeParams` with all exact parameters | always |
| 0 | allow (not for the global pattern) | always |

Above all patterns, with priority 10000, there are allow rules for the domain blacklist and for signed URLs.

A regex can't match "every host except these", so the whitelist works the other way around: `restrictToWhitelist()` gives every entry the part of its domain pattern that is in the whitelist (`intersect()`), and drops it if there is none. A global entry gets the whitelist patterns themselves. Hosts outside the whitelist then simply have no rules.

Rules of kind 3 to 6 only match when they change the URL, so they never stop the chain. The union rule of the most specific pattern is the last step. All rules use a `regexFilter`, so a union rule that changes nothing also stops the rules of broader patterns (point 3 above). The allow rule does the same in case Chrome ever falls back to lower priorities. This matters for exclusions: the broader rules may remove a parameter that is excluded on this domain. The test simulation (`test/helpers.js`) checks both behaviours.

A regex can't skip one specific parameter. If an exclusion overlaps a wildcard, that wildcard is replaced by a list of known parameter names for the pattern. If an exclusion overlaps `*`, `KEY{n}` or a parameter with a value, the rule is left out and `compileDnrRules()` returns it as unsupported (see below).

### Counter, animation, logging

`chrome.js` listens to `webRequest.onBeforeRedirect` (non-blocking, allowed in Manifest V3). For every internal redirect it checks with `cleanUrl()` whether Neat URL would change the original URL, which filters out redirects by other extensions and HSTS. Then it calls the same `reportCleaned()` as Firefox.

### What the rules can't do

Rules can't decode and encode a parameter value (option "Clean URLs inside parameters"), and some rules are unsupported (see above). A non-blocking `webRequest.onBeforeRequest` listener for main frames handles these navigations: when `cleanUrl(url)` differs from `cleanUrl(url, config, { nested: false })`, or when `needsFallback()` finds an unsupported rule for the domain, it updates the tab with the fully cleaned URL. The rules don't change that URL any more, so there is no loop. The request after a redirect by the rules is ignored, so the tab is updated once.

## Log

`reportCleaned()` in `common.js` adds every cleaned URL to a list of the last 500 in `storage.session`. That storage is kept in memory only, so the log is empty after a browser restart, and it survives a suspended background. The Log tab of the options page (`log.js`) reads the list and follows changes with `storage.onChanged`. `neat_url_log_since` in `storage.session` is the moment the log started (set by the background when it is missing, so after a browser start, and by the Clear button); an empty log shows "No URLs have been cleaned since …" with that time. Every entry also has the rules that cleaned the URL, as written in the preferences: `reportCleaned()` runs `cleanUrl()` once more with `options.applied`, so this works the same for both browsers. Save on the Log tab downloads the shown entries as JSON, with the technical details for a bug report (`getTechnicalDetails()` in `log.js`): version, browser, engine, platform, user agent, language, whether Neat URL is enabled and has access to all websites, invalid rules, the number of `declarativeNetRequest` rules (Chrome) and all preferences; Clear asks for confirmation first. The menu of the toolbar button opens the options page on `#log`, in the tab that is already open if there is one. A click on the toolbar button opens `#preferences` with the URL of the tab (`options.html?test=<URL>`); an options page that is already open gets the message `show-options` instead, so it doesn't reload and keeps unsaved changes. In Chrome only the first internal redirect of a navigation is reported, so the log shows the result of `cleanUrl()`, which is where the chain of rules ends.

## Sync preferences

`src/background/sync.js` copies the preferences between `storage.local` and `storage.sync` (#123). `storage.local` stays the source of truth: the rest of Neat URL never reads `storage.sync`. The switch on the Advanced tab is stored per device in `neat_url_sync`, outside the preferences, so it isn't synchronized or exported itself.

* Format (`src/core/sync.js`): `storage.sync` allows 8 KB per item and 100 KB in total, so every preference is stored as JSON in chunks (`neat_url_sync_chunk:<preference>:<n>`), with one item `neat_url_sync_meta` that has the version of Neat URL, the time of the change, and the number of chunks and a hash per preference. Another device may receive the items one by one; until every hash matches, `fromSyncItems()` returns null and the download waits for the next change.
* Upload: a change of a preference in `storage.local` that differs from `storage.sync` sets `neat_url_sync_pending` to the time of the change, and is uploaded 2 seconds later (`storage.sync` allows 120 writes per minute). A download also changes `storage.local`, but then the preferences are the same as in `storage.sync`, so it isn't uploaded again.
* Download: a change of the meta item writes the changed preferences to `storage.local`, and `common.js` reloads its state as after saving the options. A pending local change that is newer wins; otherwise the last change wins.
* The background can be suspended before an upload, so every start of the background uploads a pending change, or else downloads.
* A device with an older version of Neat URL neither downloads nor uploads the preferences of a newer version, so it can't overwrite them.
* Turning it on: when `storage.sync` already has other preferences, the options page asks whether to use them (message `sync-enable` with `use: "synced"`) or to keep the preferences of this device and upload them (`use: "local"`). `neat_url_sync_status` has the result of the last synchronization for the options page.

## Change links in page

`src/content/links.js` runs on every page. When the option is off, it only reads the option from `storage.local` and stops, so the background is not woken up. When it is on, it asks the background for the config (message `get-config`) and cleans links with the same `cleanUrl()`: all links when the page has loaded, and a link again just before it is used (mousedown, middle click, context menu, keyboard, focus), so links that the page adds later are cleaned too.

## Design decisions

* **Firefox keeps blocking `webRequest`** in Manifest V3, so Firefox loses no features. Firefox also supports `declarativeNetRequest`, but its limits (no wildcards in `removeParams`, regex limits) only make sense where there is no alternative.
* **One version number for both browsers.** The parameter rules and preferences are the same; [browser-support.md](browser-support.md) lists the differences.
* **A content script only for "Change links in page".** Hash parameters work through the rules, because Chrome sees the fragment of a navigation.
* **Safe defaults.** Parameters with a generic name that sites use for other purposes are not defaults (`cid`, `siteId`, `campaignId`, ...), signed URLs are kept, and URLs inside parameters are only cleaned when you turn that on.
* **Firefox 140 and Chrome 121 as minimum versions.** Firefox 140 is the oldest supported ESR and supports `data_collection_permissions`. Chrome 121 raised the number of dynamic rules.
