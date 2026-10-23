# Development

Requirements: Node.js 20 or newer. For the end-to-end tests also `openssl` (included with Git for Windows) and the Puppeteer browsers.

```sh
npm install --ignore-scripts                     # Puppeteer, only needed for the end-to-end tests
npx puppeteer browsers install chrome firefox    # Chrome for Testing and Firefox for the end-to-end tests
```

## Build

```sh
npm run build        # dist/firefox and dist/chrome
npm run build:zip    # also web-ext-artifacts/neat_url-<version>.<browser>.zip
```

The manifest is made from `manifests/base.json` plus `manifests/firefox.json` or `manifests/chrome.json`. Change the version in `manifests/base.json`.

To try a build:

* Firefox: `about:debugging` → This Firefox → Load Temporary Add-on → `dist/firefox/manifest.json`
* Chrome: `chrome://extensions` → Developer mode → Load unpacked → `dist/chrome`

## Tests

```sh
npm test                 # unit tests (Node test runner)
npm run test:e2e         # build + real Chrome and Firefox
node test/e2e/run.mjs chrome --only=hash    # one browser, only the cases whose name contains "hash"
npm run lint:firefox     # Mozilla's add-on linter (web-ext lint)
```

To test another Firefox version, for example the minimum version:

```sh
npx puppeteer browsers install firefox@esr_140.0esr
FIREFOX_EXECUTABLE=<path printed by the command above> node test/e2e/run.mjs firefox
```

`test/cases.json` is the shared list of test cases: a URL, the expected URL and optionally a `config` with your own parameters (`blocked`), an override list (`overrides`), a blacklist (`blacklist`), `cleanNested` or `keepSigned`. A case with `"nested": true` or `"fallback": true` is not done by the Chrome rules but by `chrome.js` (see [architecture.md](architecture.md)); `expectedRules` is then what the rules alone give. Each case runs:

* against `cleanUrl()` (Firefox engine)
* against the Chrome rules in a simulation of `declarativeNetRequest` (twice, for both possible behaviours of a redirect that changes nothing)
* in a real Chrome and Firefox (`npm run test:e2e`), unless the case has `"e2e": false`

Add a case there for every bug fix or new default parameter.

The end-to-end test maps every host name to a local HTTPS server (port 8443), so URLs like `https://www.google.com/...` can be tested without network access. It also tests the option "Change links in page" on a test page. In Chrome it changes the preferences through the options page. Firefox doesn't allow opening extension pages through WebDriver BiDi, so for every set of preferences it installs a copy of the build with a script that stores them.

`test/e2e/debug-chrome.mjs` shows which Chrome rules match a URL:

```sh
node test/e2e/debug-chrome.mjs "ref, !ref@amazon.co.uk" "https://www.amazon.co.uk/x?ref=1"
```

## Translations

Texts are in `_locales/<language>/messages.json`. English (`en`) is the default. `npm test` fails when a language misses a text that English has, or when `options.html` uses an id that doesn't exist. So a new text must be added to every language.

## Release checklist

1. Update the version in `manifests/base.json` and `CHANGELOG.md`.
2. `npm test`, `npm run test:e2e` and `npm run lint:firefox` pass.
3. Manual check in Firefox:
   * fresh install, then a link with `utm_source` and `fbclid`
   * update from the previous release with your own parameters and removed defaults: nothing lost, removed defaults stay off. For 7.0.0: update from 5.0.0 (the last release) with a real profile, and from 4.1.5.
   * save the preferences, then turn Neat URL off and on with the toolbar button
   * restart the browser with restored tabs
   * counter, animation, a link to addons.mozilla.org
   * the options "Clean URLs inside parameters" and "Change links in page"
   * export the preferences, change something, import the file again
   * sign in to a Google account and download a file from a site with signed links (#307, #314)
   * turn off access to all websites in the add-on manager: the options page shows the button to allow it again
4. The same manual check in Chrome (without addons.mozilla.org and the access button).
5. `npm run build:zip` and upload `web-ext-artifacts/neat_url-<version>.firefox.zip` to AMO and `neat_url-<version>.chrome.zip` to the Chrome Web Store.
6. Chrome Web Store: the privacy form asks for a reason per permission. Use the "Why" column of the permissions table in [browser-support.md](browser-support.md). Neat URL collects no data and sends nothing anywhere.
