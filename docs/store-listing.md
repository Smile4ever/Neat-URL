# Store listing

The texts for [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/neat-url/) and the [Chrome Web Store](https://chrome.google.com/webstore/detail/neat-url/jchobbjgibcahbheicfocecmhocglkco). The screenshots are in [images/store](../images/store) (1280×800, English, made with the Chrome build).

## Name

Neat URL

## Summary

Both stores (Chrome allows 132 characters, Firefox 250):

> Remove tracking parameters like utm_source and fbclid from URLs. Test any URL, add your own rules and see what was cleaned.

## Screenshots

The Chrome Web Store shows at most 5 screenshots: use 1 to 5. addons.mozilla.org gets all of them, with the captions.

| File | Caption |
|---|---|
| [1-test-a-url.png](../images/store/1-test-a-url.png) | Test a URL: see which parameters Neat URL removes and which rules removed them. |
| [2-suggestions.png](../images/store/2-suggestions.png) | A parameter that is left? Click a suggested rule to remove it, for all websites or for one website only. |
| [5-log.png](../images/store/5-log.png) | The Log tab shows the last cleaned URLs, with the removed parameters struck through. |
| [3-default-parameters.png](../images/store/3-default-parameters.png) | 170 default parameters in categories. Uncheck a parameter or a category to keep it in URLs. |
| [8-dark-mode.png](../images/store/8-dark-mode.png) | The options page follows the dark mode of your system. |
| [4-own-rules.png](../images/store/4-own-rules.png) | Your own rules: per website, with wildcards, exclusions and values. Invalid rules are pointed out before you save. |
| [7-advanced.png](../images/store/7-advanced.png) | Advanced options: change links in pages, keep signed URLs, clean URLs inside parameters, request types, import and export. |
| [6-appearance.png](../images/store/6-appearance.png) | Choose the icon animation, the icon theme and the counter on the toolbar button. |

## Description for addons.mozilla.org

AMO accepts a few HTML tags (`<b>`, `<i>`, `<code>`, `<a>`, `<ul>`, `<li>`); line breaks are kept.

```html
Neat URL removes tracking parameters from the URLs you open, like Google Analytics' <code>utm_source</code>, Facebook's <code>fbclid</code> and Google Ads' <code>gclid</code>. The page loads without them, so the link you bookmark, copy or share is clean too.

<b>Example</b>
Before: https://www.theverge.com/tech/review?utm_source=newsletter&utm_medium=email&utm_campaign=weekly
After: https://www.theverge.com/tech/review

<b>Features</b>
<ul><li>170 default parameters, in categories per website and tracking service. Uncheck one to keep it.</li><li><b>Test a URL</b>: paste a URL to see what is removed and which rule removed it. For every parameter that is left, Neat URL suggests a rule; one click adds it.</li><li>Click the toolbar button to test the URL of the current tab.</li><li><b>Log</b>: the last 500 cleaned URLs, with the removed parameters struck through. It is kept in memory only.</li><li>Your own rules: for all websites or one website, with wildcards, exclusions and values (see below).</li><li>A domain blacklist for websites that Neat URL should leave alone.</li><li>Keeps signed URLs (like <code>X-Amz-Signature</code>) unchanged, so downloads keep working.</li><li>Optional: clean the links in a page, and clean URLs inside parameters.</li><li>A counter and an animation on the toolbar button. Right-click it to disable Neat URL until the browser restarts.</li><li>Import and export of your preferences.</li><li>Dark mode, and the options page in 16 languages.</li></ul>
<b>Rules</b>
<ul><li><code>utm_source</code>: on every website</li><li><code>nb@tweakers.net</code>: on one website (and <code>www.</code>)</li><li><code>param@*.wired.com</code>: also on every subdomain</li><li><code>param@google.*</code>: on google.com, google.co.uk and so on</li><li><code>utm_*</code>: every parameter that starts with <code>utm_</code></li><li><code>ref=share@amazon.com</code>: only with this value</li><li><code>!ref@amazon.co.uk</code>: keep this parameter on this website (an exclusion always wins)</li><li><code>#?pk_campaign</code>: a parameter after the <code>#</code></li><li><code>$/ref@amazon.*</code>: remove everything after <code>/ref</code> in the path</li></ul>
Start a line with <code>Name:</code> to group your rules. All rules are explained on <a href="https://github.com/Smile4ever/Neat-URL#parameter-rules">GitHub</a>.

<b>Privacy</b>
Neat URL doesn't collect or send any data. It needs access to all websites to clean their URLs.

<b>Requirements</b>
Firefox 140 or newer.

<b>Bug reports and feature requests</b>
Open an issue on GitHub: https://github.com/Smile4ever/Neat-URL/issues/new
On the Log tab, "Save log for a bug report" makes a file with the details that help to solve the problem.

<b>History</b>
Neat URL is based on Lean URL.
```

## Description for the Chrome Web Store

Plain text only.

```text
Neat URL removes tracking parameters from the URLs you open, like Google Analytics' utm_source, Facebook's fbclid and Google Ads' gclid. The page loads without them, so the link you bookmark, copy or share is clean too.

EXAMPLE
Before: https://www.theverge.com/tech/review?utm_source=newsletter&utm_medium=email&utm_campaign=weekly
After: https://www.theverge.com/tech/review

FEATURES
• 170 default parameters, in categories per website and tracking service. Uncheck one to keep it.
• Test a URL: paste a URL to see what is removed and which rule removed it. For every parameter that is left, Neat URL suggests a rule; one click adds it.
• Click the toolbar button to test the URL of the current tab.
• Log: the last 500 cleaned URLs, with the removed parameters struck through. It is kept in memory only.
• Your own rules: for all websites or one website, with wildcards, exclusions and values (see below).
• A domain blacklist for websites that Neat URL should leave alone.
• Keeps signed URLs (like X-Amz-Signature) unchanged, so downloads keep working.
• Optional: clean the links in a page, and clean URLs inside parameters.
• A counter and an animation on the toolbar button. Right-click it to disable Neat URL until the browser restarts.
• Import and export of your preferences.
• Dark mode, and the options page in 16 languages.

Neat URL uses declarativeNetRequest: Chrome itself removes the parameters, before the request leaves your browser.

RULES
utm_source — on every website
nb@tweakers.net — on one website (and www.)
param@*.wired.com — also on every subdomain
param@google.* — on google.com, google.co.uk and so on
utm_* — every parameter that starts with utm_
ref=share@amazon.com — only with this value
!ref@amazon.co.uk — keep this parameter on this website (an exclusion always wins)
#?pk_campaign — a parameter after the #
$/ref@amazon.* — remove everything after /ref in the path

Start a line with "Name:" to group your rules. All rules are explained on GitHub: https://github.com/Smile4ever/Neat-URL#parameter-rules

PRIVACY
Neat URL doesn't collect or send any data. It needs access to all websites to clean their URLs.

REQUIREMENTS
Chrome 121 or newer.

BUG REPORTS AND FEATURE REQUESTS
Open an issue on GitHub: https://github.com/Smile4ever/Neat-URL/issues/new
On the Log tab, "Save log for a bug report" makes a file with the details that help to solve the problem.

HISTORY
Neat URL is based on Lean URL.
```
