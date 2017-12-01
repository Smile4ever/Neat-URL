# Neat URL

Neat URL cleans URLs, removing parameters such as Google Analytics' utm parameters.

## Blocked Parameters

utm_source, utm_medium, utm_term, utm_content, utm_campaign, utm_reader, utm_place, utm_userid, utm_cid, utm_name, utm_pubreferrer, utm_swu, utm_viz_id, ga_source, ga_medium, ga_term, ga_content, ga_campaign, ga_place, yclid, _openstat, fb_action_ids, fb_action_types, fb_ref, fb_source, action_object_map, action_type_map, action_ref_map, gs_l, pd_rd_r@amazon.&ast;, pd_rd_w@amazon.&ast;, pd_rd_wg@amazon.&ast;, _encoding@amazon.&ast;, psc@amazon.&ast;, ved@google.&ast;, ei@google.&ast;, sei@google.&ast;, gws_rd@google.&ast;, cvid@bing.com, form@bing.com, sk@bing.com, sp@bing.com, sc@bing.com, qs@bing.com, pq@bing.com, feature@youtube.com, gclid@youtube.com, kw@youtube.com, $/ref@amazon.&ast, _hsenc, mkt_tok, hmb_campaign, hmb_source, hmb_medium;

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
    
Parameters can contain @ signs with a wildcard so every subdomain will match too:

    param@*.wired.com
    
Parameters can contain @ signs with a wildcard at the end of a domain name (matches every domain name which begins with "google" and ends in an unknown suffix:

    param@google.*

Parameters can contain a wildcard at the end or before the domain sign:

    utm_*
    utm_*@omgubuntu.co.uk

Other valid parameters - ending parameters (exceptions to the ? rule):

	$/ref@amazon.* (remove everything after /ref on amazon domains - this will only apply when there are no query parameters left after removing the filtered query parameters. Exception: Amazon product pages parameters are cleaned like they contain two dollar signs)
	$$/ref@amazon.* (remove everything after /ref on amazon domains - this will always apply, even when there are other query parameters after removing the filtered query parameters - this option is available because the user should be in control but beware that double dollar signs are dangerous, it might break the URL)

Other valid parameters - hash parameters (exceptions to the ? rule):

	#xtor=RSS-8 (remove this parameter - be sure to include its value as well when you are using anchor tags)
	#xtor=RSS-8@futura-sciences.com
	#?pk_campaign (normal parameters that come after a hash sign, for example this URL  https://vivaldi.com/blog/teamblog/vivaldi-1-13-adds-window-panel/#pk_campaign=newsletter&pk_kwd=community gets changed to https://vivaldi.com/blog/teamblog/vivaldi-1-13-adds-window-panel/#pk_kwd=community)
	#?pk_campaign@vivaldi.com (same as above, but domain-matched instead of global)

Invalid parameters:
    
    param@*.google.* (too many wildcards)
    !ved (this is some random string - not supported, it will not work)
    /ref@amazon.*$ (dollar sign should be at the beginning)

## Recommended parameters
For addons.mozilla.org:
src@addons.mozilla.org, source@addons.mozilla.org, surveyversion@addons.mozilla.org, updateChannel@addons.mozilla.org, fxVersion@addons.mozilla.org, isDefaultBrowser@addons.mozilla.org, searchEngine@addons.mozilla.org, syncSetup@addons.mozilla.org, type@addons.mozilla.org, flowId@addons.mozilla.org

For Tweakers.net:
nb@tweakers.net, u@tweakers.net

For Vivaldi.com:
#?pk_campaign@vivaldi.com, #?pk_kwd@vivaldi.com

Other parameters you can consider:
_hsmi, algo_expid, algo_pvid, aqs, bav, bih, biw, btsid, bvm, cn, cp, csi, dpr, dq, ech, forward, gs_gbg, gs_mss, gs_rn, iact, icid, iid, ijn, mc_cid, mc_eid, ncid, ndsp, nid, nr_email_referer, oq, pbx, pf, pf_rd_i, pf_rd_m, pf_rd_p, pf_rd_r, pf_rd_s, pf_rd_t, pq, prmd, psi, ref_, refsrc, sa, sclient, scroll, sr_share, stick, tbnid, vero_conv, vero_id, vet, ws_ab_test, yv

## History
Neat URL is based on [Lean URL](https://github.com/xmikro/lean-url/).

Neat URL contains a few improvements:
* set your own URL parameters on the options page (to reach feature parity with Pure URL)
* fixed for recent Firefox versions
* a nice animation in the toolbar (can be changed or disabled)
* domain-specific blocked parameters (to reach feature parity with Pure URL)
* wildcard domain-specific blocked parameters
* wildcard at the end of blocked parameters (general or domain-specific)