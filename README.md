# Neat URL

Neat URL is a browser extension that cleans URLs, removing parameters such as Google Analytics' utm parameters. Use with [Firefox][] and [Chrome][].

[Firefox]: https://addons.mozilla.org/en-US/firefox/addon/neat-url/
[Chrome]: https://chrome.google.com/webstore/detail/neat-url/jchobbjgibcahbheicfocecmhocglkco

## Download

[Firefox Addon](https://addons.mozilla.org/en-US/firefox/addon/neat-url/)  
[Chrome Addon](https://chrome.google.com/webstore/detail/neat-url/jchobbjgibcahbheicfocecmhocglkco)

## Default blocked parameters

```json
{
    "categories": [
        { "name": "Action Map", "params": ["action_object_map", "action_type_map", "action_ref_map"]},
        { "name": "AliExpress.com", "params": ["spm@*.aliexpress.com", "scm@*.aliexpress.com", "aff_platform", "aff_trace_key"]},
        { "name": "Amazon", "params": ["pd_rd_*@amazon.*", "_encoding@amazon.*", "psc@amazon.*", "tag@amazon.*", "ref_@amazon.*", "pf_rd_*@amazon.*"]},
        { "name": "Bilibili.com", "params": ["callback@bilibili.com"]},
        { "name": "Bing", "params": ["cvid@bing.com", "form@bing.com", "sk@bing.com", "sp@bing.com", "sc@bing.com", "qs@bing.com", "pq@bing.com"]},
        { "name": "Campaign tracking (Adobe Analytics)", "params": ["sc_cid"]},
        { "name": "Campaign tracking (Adobe Marketo)", "params": ["mkt_tok"]},
        { "name": "Campaign tracking (Amazon Kendra)", "params": ["trk", "trkCampaign"]},
        { "name": "Campaign tracking (ga, Google Analytics)", "params": ["ga_*"]},
        { "name": "Campaign tracking (Humble Bundle)", "params": ["hmb_campaign", "hmb_medium", "hmb_source"]},
        { "name": "Campaign tracking (itm)", "params": ["itm_*"], "docs": "https://www.parse.ly/help/post/4843/campaign-data-tracking/"},
        { "name": "Campaign tracking (pk)", "params": ["pk_*"]},
        { "name": "Campaign tracking (sc)", "params": ["sc_campaign", "sc_channel", "sc_content", "sc_medium", "sc_outcome", "sc_geo", "sc_country"]},
        { "name": "Campaign tracking (utm)", "params": ["utm_*"]},
        { "name": "Campaign tracking (Yandex)", "params": ["yclid", "_openstat"], "docs": "https://yandex.com/support/direct/statistics/url-tags.html"},
        { "name": "Campaign tracking (others)", "params": ["mbid", "cmpid", "cid", "c_id", "campaign_id", "Campaign"], "docs": "https://www.parse.ly/help/post/4843/campaign-data-tracking/"},
        { "name": "Facebook", "params": ["fb_action_ids", "fb_action_types", "fb_ref", "fb_source", "fbclid"]},
        { "name": "Google", "params": ["gs_l", "ved@google.*", "ei@google.*", "sei@google.*", "gws_rd@google.*"]},
        { "name": "Hubspot", "params": ["_hsenc", "_hsmi", "__hssc", "__hstc", "hsCtaTracking"]},
        { "name": "IBM Acoustic Campaign", "params": ["spReportId", "spJobID", "spUserID", "spMailingID"]},
        { "name": "Oracle Eloqua", "params": ["elqTrackId", "elqTrack", "assetType", "assetId", "recipientId", "campaignId", "siteId"]},
        { "name": "SourceForge.net", "params": ["source@sourceforge.net", "position@sourceforge.net"]},
        { "name": "YouTube", "params": ["feature@youtube.com", "gclid@youtube.com", "kw@youtube.com"]},
        { "name": "Zeit.de", "params": ["wt_zmc"]}
    ]
}
```

## Example

Before:
* http://www.phoronix.com/scan.php?page=news_item&px=Ioquake3-Auto-Updater&utm_source=feedburner&utm_medium=feed&utm_campaign=Feed%3A+Phoronix+(Phoronix)

After:
* http://www.phoronix.com/scan.php?page=news_item&px=Ioquake3-Auto-Updater

## Why should I use this?

Are you tired of handing over data to Google or other companies?

Do you want to see neater URLs?

Neat URL is just what you're looking for!

## Parameter rules
A parameter is something that starts with ?. You can add your own parameter in the options of Neat URL. The ? is ommitted in the options, so a ?ved parameter becomes "ved". There are a few exceptions to this rule (see below)

Parameters can be global (for every domain):

    utm_source

Parameters can contain @ signs (domain-specific):

    nb@tweakers.net
    
Parameters can contain @ signs with a wildcard so every subdomain will match too (root wildcard domain):

    param@*.wired.com
    
Parameters can contain @ signs with a wildcard at the end of a domain name (matches every domain name which begins with "google" and ends in an unknown suffix, called suffix wildcard domain):

    param@google.*

Mixing a root wild card domain with a suffix wildcard domain in the same parameter is also possible:

    param@*.google.* (too many wildcards)

Parameters can contain a wildcard at the end or before the domain sign:

    utm_*
    utm_*@omgubuntu.co.uk

Parameters can also apply globally (first rule), except for a (wildcard) domain (second rule):

	ref
	!ref@amazon.co.uk

The excluded domain always takes precedence. Should you include "ref" and "!ref", "!ref" will apply.

Other valid parameters - ending parameters (exceptions to the ? rule):

	$/ref@amazon.* (remove everything after /ref on Amazon domains - this will only apply when there are no query parameters left after removing the filtered query parameters. Exception: Amazon product pages parameters are cleaned like they contain two dollar signs)
	$$/ref@amazon.* (remove everything after /ref on Amazon domains - this will always apply, even when there are other query parameters after removing the filtered query parameters - this option is available because the user should be in control but beware that double dollar signs are dangerous, it might break the URL)

Other valid parameters - hash parameters (exceptions to the ? rule):

	#xtor=RSS-8 (remove this parameter - be sure to include its value as well when you are using anchor tags)
	#xtor=RSS-8@futura-sciences.com for example this URL http://www.futura-sciences.com/magazines/espace/infos/actu/d/astronautique-curiosity-franchi-succes-dune-dingo-gap-52289/#xtor=RSS-8
	#?pk_campaign (normal parameters that come after a hash sign, for example this URL https://vivaldi.com/blog/teamblog/vivaldi-1-13-adds-window-panel/#pk_campaign=newsletter&pk_kwd=community gets changed to https://vivaldi.com/blog/teamblog/vivaldi-1-13-adds-window-panel/#pk_kwd=community)
	#?pk_campaign@vivaldi.com (same as above, but domain-matched instead of global)

Invalid parameters:
    
    |ved (this is some random string - not supported, it will not work)
    /ref@amazon.*$ (dollar sign should be at the beginning)

## Recommended parameters
Parameters meant for the general public are included as default blocked parameters. You can add your own parameters for specific websites that are not (yet) supported by default. Parameters with only one or two letters will never be included in Neat URL by default, unless they can be given a domain.

For Tweakers.net:
nb@tweakers.net, u@tweakers.net

For Vivaldi.com:
#?pk_campaign@vivaldi.com, #?pk_kwd@vivaldi.com

Google Analytics - tracking
https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters

tid, aip, ds, qt, cid, uid, uip, ua, geoid, dr, cn, cs, cm, ck, cc, ci, gclid, dclid, linkid

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
* icid (http://www.kshb.com/livevideo?ICID=ref_fark)
* sr_share (SimpleReach - http://web.archive.org/web/20190817204709/http://docs.simplereach.com/how-tos-1/setting-up-tracking-parameters-for-social-distribution)

For addons.mozilla.org:
src@addons.mozilla.org, source@addons.mozilla.org, surveyversion@addons.mozilla.org, updateChannel@addons.mozilla.org, fxVersion@addons.mozilla.org, isDefaultBrowser@addons.mozilla.org, searchEngine@addons.mozilla.org, syncSetup@addons.mozilla.org, type@addons.mozilla.org, flowId@addons.mozilla.org

(only works when extensions.webextensions.restrictedDomains is edited in about:config)
(test URL https://support.mozilla.org/de/kb/enterprise-roots?as=u&utm_source=inproduct)

Other parameters you can consider (website unknown)
* iid
* ijn
* ncid
* nid
* ref_

## Help, it does not work!
* Have you checked that the syntax you are using is valid?
* WebExtensions (like Neat URL) aren't allow to work on several Mozilla domains. This is a security feature. To allow all WebExtensions to work on these websites, you need to edit extensions.webextensions.restrictedDomains in about:config.

## History
Neat URL is based on [Lean URL](https://github.com/xmikro/lean-url/).

Neat URL contains a few improvements:
* set your own URL parameters on the options page (to reach feature parity with Pure URL)
* fixed for recent Firefox versions
* a nice animation in the toolbar (can be changed or disabled)
* domain-specific blocked parameters (to reach feature parity with Pure URL)
* wildcard domain-specific blocked parameters
* wildcard at the end of blocked parameters (general or domain-specific)
