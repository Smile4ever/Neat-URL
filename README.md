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
        { "name": "Action Map", "params": ["action_object_map", "action_ref_map", "action_type_map"]},
        { "name": "AliExpress.com", "params": ["aff_platform", "aff_trace_key", "algo_expid@*.aliexpress.*", "algo_pvid@*.aliexpress.com", "btsid@*.aliexpress.com", "expid@*.aliexpress.com", "initiative_id@*.aliexpress.com", "scm_id@*.aliexpress.com", "spm@*.aliexpress.com", "ws_ab_test*.aliexpress.com"]},
        { "name": "Amazon", "params": ["_encoding@amazon.*", "ascsubtag@amazon.*", "pd_rd_*@amazon.*", "pf@amazon.*", "pf_rd_*@amazon.*", "psc@amazon.*", "ref_@amazon.*", "tag@amazon.*"]},
        { "name": "Bilibili.com", "params": ["callback@bilibili.com"]},
        { "name": "Bing", "params": ["cvid@bing.com", "form@bing.com", "pq@bing.com", "qs@bing.com", "sc@bing.com", "sk@bing.com", "sp@bing.com"]},
        { "name": "Campaign tracking (Adobe Analytics)", "params": ["sc_cid"]},
        { "name": "Campaign tracking (Adobe Marketo)", "params": ["mkt_tok"]},
        { "name": "Campaign tracking (Amazon Kendra)", "params": ["trk", "trkCampaign"]},
        { "name": "Campaign tracking (at)", "params": ["at_campaign", "at_custom*", "at_medium"]},
        { "name": "Campaign tracking (Change.org)", "params": ["guest@change.org", "recruited_by_id@change.org", "recruiter@change.org", "short_display_name@change.org", "source_location@change.org"]},
        { "name": "Campaign tracking (DPG Media)", "params": ["dpg_*"]},
        { "name": "Campaign tracking (Google Analytics, ga)", "params": ["ga_*", "gclid", "gclsrc"]},
        { "name": "Campaign tracking (Humble Bundle)", "params": ["hmb_campaign", "hmb_medium", "hmb_source"]},
        { "name": "Campaign tracking (IBM Acoustic Campaign)", "params": ["spJobID", "spMailingID", "spReportId", "spUserID"]},
        { "name": "Campaign tracking (itm)", "params": ["itm_*"], "docs": "https://www.parse.ly/help/post/4843/campaign-data-tracking/"},
        { "name": "Campaign tracking (Omniture)", "params": ["s_cid"], "docs": "https://moz.com/community/q/omniture-tracking-code-urls-creating-duplicate-content"},
        { "name": "Campaign tracking (Oracle Eloqua)", "params": ["assetId", "assetType", "campaignId", "elqTrack", "elqTrackId", "recipientId", "siteId"]},
        { "name": "Campaign tracking (MailChimp)", "params": ["mc_cid", "mc_eid"], "docs": "https://www.learndigitaladvertising.com/solved-why-how-to-remove-mc_cid-and-mc_eid-from-google-analytics/"},
        { "name": "Campaign tracking (Matomo/Piwik)", "params": ["mtm_*", "pk_*"]},
        { "name": "Campaign tracking (ns)", "params": ["ns_*"]},
        { "name": "Campaign tracking (sc)", "params": ["sc_campaign", "sc_channel", "sc_content", "sc_country", "sc_geo", "sc_medium", "sc_outcome"]},
        { "name": "Campaign tracking (stm)", "params": ["stm_*"]},
        { "name": "Campaign tracking (utm)", "params": ["nr_email_referer", "utm_*"]},
        { "name": "Campaign tracking (Vero)", "params": ["vero_conv", "vero_id"], "docs": "https://help.getvero.com/articles/conversion-tracking.html"},
        { "name": "Campaign tracking (Yandex)", "params": ["_openstat", "yclid"], "docs": "https://yandex.com/support/direct/statistics/url-tags.html"},
        { "name": "Campaign tracking (others)", "params": ["c_id", "campaign_id", "Campaign", "cmpid", "mbid", "ncid"], "docs": "https://www.parse.ly/help/post/4843/campaign-data-tracking/"},
        { "name": "Caseking.de", "params": ["campaign@caseking.de", "sPartner@caseking.de"]},
        { "name": "Ebay", "params": ["hash@ebay.*"]},
        { "name": "Facebook", "params": ["fb_action_ids", "fb_action_types", "fb_ref", "fb_source", "fbclid", "hrc@facebook.com", "refsrc@facebook.com"]},
        { "name": "Google", "params": ["ei@google.*", "gs_gbg@google.*", "gs_l", "gs_lcp@google.*", "gs_mss@google.*", "gs_rn@google.*", "gws_rd@google.*", "sei@google.*", "ved@google.*"]},
        { "name": "Hubspot", "params": ["_hsenc", "_hsmi", "__hssc", "__hstc", "hsCtaTracking"]},
        { "name": "IMDb", "params": ["pf_rd_*@imdb.com", "ref_@imdb.com"]},
        { "name": "LinkedIn", "params": ["eBP@linkedin.com", "lgCta@linkedin.com", "lgTemp@linkedin.com", "lipi@linkedin.com", "midSig@linkedin.com", "midToken@linkedin.com", "recommendedFlavor@linkedin.com", "refId@linkedin.com", "trackingId@linkedin.com", "trk@linkedin.com", "trkEmail@linkedin.com"]},
        { "name": "Medium", "params": ["_branch_match_id@medium.com", "source@medium.com"]},
        { "name": "SourceForge.net", "params": ["position@sourceforge.net", "source@sourceforge.net"]},
        { "name": "Spotify", "params": ["context@open.spotify.com", "si@open.spotify.com"]},
        { "name": "TikTok", "params": ["_d@tiktok.com", "checksum@tiktok.com", "is_copy_url@tiktok.com", "is_from_webapp@tiktok.com", "language@tiktok.com", "preview_pb@tiktok.com", "sec_user_id@tiktok.com", "sender_device@tiktok.com", "sender_web_id@tiktok.com", "share_app_id@tiktok.com", "share_link_id@tiktok.com", "share_item_id@tiktok.com", "source@tiktok.com", "timestamp@tiktok.com", "tt_from@tiktok.com", "u_code@tiktok.com", "user_id@tiktok.com"]},
        { "name": "Twitch.tv", "params": ["tt_content", "tt_medium"]},
        { "name": "Twitter", "params": ["cxt@*.twitter.com", "ref_*@*.twitter.com", "s@*.twitter.com", "t@*.twitter.com", "twclid"]},
        { "name": "Yahoo", "params": ["guccounter@*.yahoo.com", "soc_src", "soc_trk"]},
        { "name": "Yandex", "params": ["lr@yandex.*", "redircnt@yandex.*"]},
        { "name": "YouTube.com", "params": ["feature@youtube.com", "kw@youtube.com"]},
        { "name": "Zeit.de", "params": ["wt_mc", "wt_zmc"]},
        { "name": "Unknown", "params": ["#xtor"]}
    ]
}
```

## Example

Before:
* https://www.phoronix.com/scan.php?page=news_item&px=Ioquake3-Auto-Updater&utm_source=feedburner&utm_medium=feed&utm_campaign=Feed%3A+Phoronix+(Phoronix)

After:
* https://www.phoronix.com/scan.php?page=news_item&px=Ioquake3-Auto-Updater

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
    *@omgubuntu.co.uk

Parameters can also apply globally (first rule), except for a (wildcard) domain (second rule):

	ref
	!ref@amazon.co.uk

The excluded domain always takes precedence. Should you include "ref" and "!ref", "!ref" will apply.

Other valid parameters - ending parameters (exceptions to the ? rule):

	$/ref@amazon.* (remove everything after /ref on Amazon domains - this will only apply when there are no query parameters left after removing the filtered query parameters. Exception: Amazon product pages parameters are cleaned like they contain two dollar signs)
	$$/ref@amazon.* (remove everything after /ref on Amazon domains - this will always apply, even when there are other query parameters after removing the filtered query parameters - this option is available because the user should be in control but beware that double dollar signs are dangerous, it might break the URL)

Other valid parameters - hash parameters (exceptions to the ? rule):

	#xtor=RSS-8 (remove this parameter - be sure to include its value as well when you are using anchor tags)
	#xtor=RSS-8@futura-sciences.com for example this URL https://www.futura-sciences.com/magazines/espace/infos/actu/d/astronautique-curiosity-franchi-succes-dune-dingo-gap-52289/#xtor=RSS-8
	#?pk_campaign (normal parameters that come after a hash sign, for example this URL https://vivaldi.com/blog/teamblog/vivaldi-1-13-adds-window-panel/#pk_campaign=newsletter&pk_kwd=community gets changed to https://vivaldi.com/blog/teamblog/vivaldi-1-13-adds-window-panel/#pk_kwd=community)
	#?pk_campaign@vivaldi.com (same as above, but domain-matched instead of global)

Invalid parameters:
    
    |ved (this is some random string - not supported, it will not work)
    /ref@amazon.*$ (dollar sign should be at the beginning)
    ref@* (domain cannot be a wildcard, use ref instead to apply globally)

## Recommended parameters
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

## Help, it does not work!
* Have you checked that the syntax you are using is valid?
* WebExtensions (like Neat URL) aren't allow to work on several Mozilla domains. This is a security feature. To allow all WebExtensions to work on these websites, you need to edit extensions.webextensions.restrictedDomains in about:config.

## History
Neat URL is based on [Lean URL](https://github.com/xmikro/lean-url/).

Neat URL contains a few improvements:
* set your own URL parameters on the options page (to reach feature parity with Pure URL)
* fixed for recent Firefox versions and compatible with Chrome
* a nice animation and counter in the toolbar (can be changed or disabled)
* domain-specific blocked parameters (to reach feature parity with Pure URL)
* wildcard domain-specific blocked parameters
* wildcard at the end of blocked parameters (general or domain-specific)
* absolute wildcard parameter (domain-specific))
* expanded default blocked parameter offering
