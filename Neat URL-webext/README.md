# Neat URL

Neat URL cleans URLs, removing parameters such as Google Analytics' utm parameters.

## Blocked Parameters

utm_source, utm_medium, utm_term, utm_content, utm_campaign, utm_reader, utm_place, utm_userid, ga_source, ga_medium, ga_term, ga_content, ga_campaign, ga_place, yclid, _openstat, fb_action_ids, fb_action_types, fb_ref, fb_source, action_object_map, action_type_map, action_ref_map, gs_l, pd_rd_r@amazon.&ast;, pd_rd_w@amazon.&ast;, pd_rd_wg@amazon.&ast;, _encoding@amazon.&ast;, psc@amazon.&ast;, ved@google.&ast;, ei@google.&ast;, sei@google.&ast;, gws_rd@google.&ast;, cvid@bing.com, form@bing.com, sk@bing.com, sp@bing.com, sc@bing.com, qs@bing.com, pq@bing.com, feature@youtube.com, gclid@youtube.com, kw@youtube.com, $/ref@amazon.&ast;

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

Other valid parameters (exceptions to the ? rule)

	#xtor=RSS-8 (remove this parameter - be sure to include its value as well when you are using anchor tags)
	#xtor=RSS-8@futura-sciences.com
	$/ref@amazon.* (remove everything after /ref on amazon domains - this will only apply when there are no query parameters left after removing the filtered query parameters)
	$$/ref@amazon.* (remove everything after /ref on amazon domains - this will always apply, even when there are other query parameters after removing the filtered query parameters - this option is available because the user should be in control but beware that double dollar signs are dangerous, it might break the URL)
	
Invalid parameters:
    
    param@*.google.* (too many wildcards)
    !ved (this is some random string - not supported, but it might work)
    /ref@amazon.*$ (dollar sign should be at the beginning)

## Recommended parameters
For addons.mozilla.org:
src@addons.mozilla.org, source@addons.mozilla.org, surveyversion@addons.mozilla.org, updateChannel@addons.mozilla.org, fxVersion@addons.mozilla.org, isDefaultBrowser@addons.mozilla.org, searchEngine@addons.mozilla.org, syncSetup@addons.mozilla.org, type@addons.mozilla.org, flowId@addons.mozilla.org

For Humble Bundle:
hmb_campaign, hmb_source, hmb_medium

For Tweakers.net:
nb@tweakers.net, u@tweakers.net

## History
Neat URL is based on [Lean URL](https://github.com/xmikro/lean-url/).

Neat URL contains a few improvements:
* set your own URL parameters on the options page (to reach feature parity with Pure URL)
* fixed for recent Firefox versions
* a nice animation in the toolbar (can be changed or disabled)
* domain-specific blocked parameters (to reach feature parity with Pure URL)
* wildcard domain-specific blocked parameters
