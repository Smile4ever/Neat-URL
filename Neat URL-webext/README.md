# Neat URL

Neat URL cleans URLs, removing parameters such as Google Analytics' utm parameters.

## Blocked Parameters

utm_source, utm_medium, utm_term, utm_content, utm_campaign, utm_reader, utm_place, ga_source, ga_medium, ga_term, ga_content, ga_campaign, ga_place, yclid, _openstat, fb_action_ids, fb_action_types, fb_ref, fb_source, action_object_map, action_type_map, action_ref_map

## Example

Before:
* http://www.phoronix.com/scan.php?page=news_item&px=Ioquake3-Auto-Updater&utm_source=feedburner&utm_medium=feed&utm_campaign=Feed%3A+Phoronix+(Phoronix)

After:
* http://www.phoronix.com/scan.php?page=news_item&px=Ioquake3-Auto-Updater

## Why should I use this?

Are you tired of handing over data to Google or other companies?

Do you want to see neater URLs?

Neat URL is just what you're looking for!

## History
Neat URL is based on [Lean URL](https://github.com/xmikro/lean-url/).

Neat URL contains a few improvements:
* set your own URL parameters on the options page (to reach feature parity with Pure URL)
* fixed for recent Firefox versions
* a nice animation in the toolbar (can be changed or disabled)
* domain-specific blocked parameters (to reach feature parity with Pure URL)
