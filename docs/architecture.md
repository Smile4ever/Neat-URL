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
  common.js                   state, counter, icon animation, toggle, context menu, notifications
  firefox.js                  blocking webRequest listener
  chrome.js                   installs the declarativeNetRequest rules, observes their redirects
  chrome-sw.js                service worker entry point (importScripts)
src/content/
  links.js                    option "Change links in page"
log.html, log.js              log page
manifest.json                 works in both browsers; scripts/build.js makes one per browser
options.html, options.js      options page (shared)
data/                         default parameters, public suffixes
```

## Background lifecycle

Both browsers use a non-persistent background in Manifest V3: a Firefox event page and a Chrome service worker. The browser can stop it at any time. Therefore:

* All listeners are registered synchronously when the script starts.
* The preferences are loaded once into a state object (`ensureState()`) and reloaded on `storage.onChanged`. The options page only writes to `storage.local`.
* The counter per tab is kept in `storage.session`, and the on/off state of the toolbar button in `storage.local` (reset to "on" by `runtime.onStartup`).
* Migration of stored preferences runs while the state loads, and only when `neat_url_version` is lower than the current version.

## Firefox engine

`firefox.js` registers one blocking `webRequest.onBeforeRequest` listener for all request types. Firefox needs the listener before the preferences are known, so the listener checks `neat_url_types` itself. When the state is loaded, the listener is synchronous. Right after the background starts, the listener returns a promise that waits for the state, so early requests (for example restored tabs) are cleaned too.

`cleanUrl()` removes parameters by working on the raw query string, so other parameters keep their exact encoding. It leaves blacklisted domains and signed URLs alone. With the option "Clean URLs inside parameters", a parameter value that is a URL itself is decoded, cleaned with `cleanUrl()` (up to three levels deep) and encoded again in the same style.

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

The priority of a rule is `rank × 10 + kind`. The rank is the number of patterns that cover the pattern, so a more specific pattern has a higher rank.

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

Rules of kind 3 to 6 only match when they change the URL, so they never stop the chain. The union rule is the last step. All rules use a `regexFilter`, so a union rule that changes nothing also stops the rules of broader patterns (point 3 above). The allow rule does the same in case Chrome ever falls back to lower priorities. This matters for exclusions: the broader rules may remove a parameter that is excluded on this domain. The test simulation (`test/helpers.js`) checks both behaviours.

A regex can't skip one specific parameter. If an exclusion overlaps a wildcard, that wildcard is replaced by a list of known parameter names for the pattern. If an exclusion overlaps `*`, `KEY{n}` or a parameter with a value, the rule is left out and `compileDnrRules()` returns it as unsupported (see below).

### Counter, animation, logging

`chrome.js` listens to `webRequest.onBeforeRedirect` (non-blocking, allowed in Manifest V3). For every internal redirect it checks with `cleanUrl()` whether Neat URL would change the original URL, which filters out redirects by other extensions and HSTS. Then it calls the same `reportCleaned()` as Firefox.

### What the rules can't do

Rules can't decode and encode a parameter value (option "Clean URLs inside parameters"), and some rules are unsupported (see above). A non-blocking `webRequest.onBeforeRequest` listener for main frames handles these navigations: when `cleanUrl(url)` differs from `cleanUrl(url, config, { nested: false })`, or when `needsFallback()` finds an unsupported rule for the domain, it updates the tab with the fully cleaned URL. The rules don't change that URL any more, so there is no loop. The request after a redirect by the rules is ignored, so the tab is updated once.

## Log

`reportCleaned()` in `common.js` adds every cleaned URL to a list of the last 500 in `storage.session`. That storage is kept in memory only, so the log is empty after a browser restart, and it survives a suspended background. `log.html` reads the list and follows changes with `storage.onChanged`. In Chrome only the first internal redirect of a navigation is reported, so the log shows the result of `cleanUrl()`, which is where the chain of rules ends.

## Change links in page

`src/content/links.js` runs on every page. When the option is off, it only reads the option from `storage.local` and stops, so the background is not woken up. When it is on, it asks the background for the config (message `get-config`) and cleans links with the same `cleanUrl()`: all links when the page has loaded, and a link again just before it is used (mousedown, middle click, context menu, keyboard, focus), so links that the page adds later are cleaned too.

## Design decisions

* **Firefox keeps blocking `webRequest`** in Manifest V3, so Firefox loses no features. Firefox also supports `declarativeNetRequest`, but its limits (no wildcards in `removeParams`, regex limits) only make sense where there is no alternative.
* **One version number for both browsers.** The parameter rules and preferences are the same; [browser-support.md](browser-support.md) lists the differences.
* **A content script only for "Change links in page".** Hash parameters work through the rules, because Chrome sees the fragment of a navigation.
* **Safe defaults.** Parameters with a generic name that sites use for other purposes are not defaults (`cid`, `siteId`, `campaignId`, ...), signed URLs are kept, and URLs inside parameters are only cleaned when you turn that on.
* **Firefox 140 and Chrome 121 as minimum versions.** Firefox 140 is the oldest supported ESR and supports `data_collection_permissions`. Chrome 121 raised the number of dynamic rules.
