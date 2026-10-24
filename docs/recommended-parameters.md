# Recommended parameters

Notes for maintainers: parameters that are, or could become, default blocked parameters. The defaults themselves are in [data/default-params-by-category.json](../data/default-params-by-category.json).

Parameters meant for the general public are included as default blocked parameters. You can add your own parameters for specific websites that are not (yet) supported by default. Parameters with only one or two letters will never be included in Neat URL by default, unless they can be given a domain.

For Tweakers.net:
nb@tweakers.net, u@tweakers.net

For Vivaldi.com:
#?pk_campaign@vivaldi.com, #?pk_kwd@vivaldi.com

Google Analytics - tracking
https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters

tid, aip, ds, qt, uid, uip, ua, geoid, dr, cn, cs, cm, ck, cc, ci, gclid, dclid, linkid
cid (campaign id, but used for other purposes by other websites - not included by default anymore)

Google (possibly tracking)
* aqs (https://superuser.com/questions/653295/what-is-the-aqs-parameter-in-google-search-query)
* psi (possibly Page Speed Insights - possibly tracking)

Google (tracking status unknown)
* bav, bih, biw, ech (https://www.google.be/webhp?bav=on.2,or.r_qf.&biw=1920&bih=957&dpr=1&ech=1&psi=sXm9VNzfM8LYaqTigegJ.1421703563661.3&ei=sXm9VNzfM8LYaqTigegJ&emsg=NCSR&noj=1)
* bvm, csi, cp, dpr, dq, forward, iact, ndsp, pbx, pq, sa, scroll, sclient, stick, vet, yv (https://greasyfork.org/en/scripts/31223-remove-google-tracking-uwaa/code)
* tbnid

Google (non tracking)
* oq (original query)
* prmd (type of search - https://revadigital.com/2012/06/the-complicated-nature-of-google-urls/)
* npa, sc, z (Disabling Advertising Personalization - https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters)

Tracking
* icid (https://www.kshb.com/livevideo?ICID=ref_fark)
* sr_share (SimpleReach - https://web.archive.org/web/20190817204709/http://docs.simplereach.com/how-tos-1/setting-up-tracking-parameters-for-social-distribution)

For addons.mozilla.org:
src@addons.mozilla.org, source@addons.mozilla.org, surveyversion@addons.mozilla.org, updateChannel@addons.mozilla.org, fxVersion@addons.mozilla.org, isDefaultBrowser@addons.mozilla.org, searchEngine@addons.mozilla.org, syncSetup@addons.mozilla.org, type@addons.mozilla.org, flowId@addons.mozilla.org

(only works when extensions.webextensions.restrictedDomains is edited in about:config)
(test URL https://support.mozilla.org/de/kb/enterprise-roots?as=u&utm_source=inproduct)

Other parameters you can consider (website unknown)
* iid
* ijn
* nid
* ref_

## Suggested in issues

Parameters that people suggested in GitHub issues and that are not a default yet (checked against the defaults of 2026.10.24.1). Until they are, users can add the rule to Blocked parameters themselves.

| Rule | Website | Issue | Note |
| --- | --- | --- | --- |
| `igsh@instagram.com` | Instagram | [#310](https://github.com/Smile4ever/Neat-URL/issues/310) | share link of a reel or post |
| `pp@youtube.com` | YouTube | [#302](https://github.com/Smile4ever/Neat-URL/issues/302) | was used for notification clicks, now contains the search term (base64) |
| `snr@steamcommunity.com` | Steam | [#309](https://github.com/Smile4ever/Neat-URL/issues/309) | |
| `maca@dw.com` | DW | [#281](https://github.com/Smile4ever/Neat-URL/issues/281) | |
| `visit_id@*.bilibili.com` | bilibili | [#296](https://github.com/Smile4ever/Neat-URL/issues/296) | |
| `usp@*.google.com` | Google Docs, Colab | [#277](https://github.com/Smile4ever/Neat-URL/issues/277) | `?usp=sharing` on shared links |
| `s@*.substack.com` | Substack | [#277](https://github.com/Smile4ever/Neat-URL/issues/277) | `?s=r` |
| `srnd@bloomberg.com` | Bloomberg | [#277](https://github.com/Smile4ever/Neat-URL/issues/277), [#208](https://github.com/Smile4ever/Neat-URL/issues/208) | |
| `lang@twitter.com`, `lang@x.com` | X (Twitter) | [#277](https://github.com/Smile4ever/Neat-URL/issues/277) | the language of the page, not tracking |
| `hl@google.*` | Google | [#277](https://github.com/Smile4ever/Neat-URL/issues/277) | the language of Google, not tracking: not a good default |
| `client@google.*` | Google | [#215](https://github.com/Smile4ever/Neat-URL/issues/215) | `client=firefox-b-d` is added by Firefox itself |
| `CMP@theguardian.com` | The Guardian | [#208](https://github.com/Smile4ever/Neat-URL/issues/208) | |
| `ocid` | MSN and other Microsoft websites | [#208](https://github.com/Smile4ever/Neat-URL/issues/208) | to investigate: which websites, and whether it needs a domain |
| `gps-id@aliexpress.*`, `scm-url@aliexpress.*`, `pvid@aliexpress.*` | AliExpress | [#239](https://github.com/Smile4ever/Neat-URL/issues/239) | the reporter says AliExpress has changed its parameters since; `scm_id` is already a default |
| `si@ebay.*`, `item@ebay.*` | eBay | [#135](https://github.com/Smile4ever/Neat-URL/issues/135) | to investigate: `item` may be needed by some pages; `_trksid`, `_trkparms` and `hash` are already defaults |
| `#?ref@spiegel.de` | Der Spiegel | [#133](https://github.com/Smile4ever/Neat-URL/issues/133) | a parameter after the `#` |
| `highlight@docs.python.org` | Sphinx documentation | [#279](https://github.com/Smile4ever/Neat-URL/issues/279) | the search term on a Sphinx search result; `highlight` on its own is too generic |

Exclusions that were suggested:

| Rule | Website | Issue | Note |
| --- | --- | --- | --- |
| `!campaign_id@paypal.com` | PayPal | [#305](https://github.com/Smile4ever/Neat-URL/issues/305) | `campaign_id` (a default) is needed for donation pages like https://www.paypal.com/donate?campaign_id=... |
