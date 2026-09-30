Lover Legend Online Store V9.1 PATCH from V8.2

Key fixes / changes:
- Critical Product Management click path audited: first-click fast handling for room cards, Manage Template, Remove from Room, per-unit Save/Publish
- Remove from Room now hard-returns to Product Management overview (VIP / Premium / Starter / other categories), never a blank subview
- Manage Template button replaced with a fresh DOM node to strip stacked legacy click handlers; hard navigation renders Bonsai Content Templates directly
- Clearing Template Name immediately clears keyword, Bonsai Description and Care Guide
- Child / Individual / Random price validation is live while typing:
  * above mother default price => immediate warning + invalid for save/publish
  * below Online protection floor => immediate warning
- Individual Tree active limit raised to 10 per room tier
- Random allocation accepts 1..10, subject to real remaining Import stock
- Save and Publish/Unpublish remain independent per Child and per Random
- Interaction CSS uses touch-action: manipulation and immediate pressed feedback
- No new polling, MutationObserver, Full Sync or Import fetch
- Version 8.3 / Build 8300
