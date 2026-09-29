Lover Legend Online Store V5.8 PATCH from V5.6
Build 5700

Verified V5.8 fixes
- Line Clear Postage Calculator is now embedded directly inside Logistics Management > Online packaging size/weight A-E Working Settings.
- Placement: A-E tiers -> Online default packaging material cost -> Line Clear calculator -> Save Working Settings.
- The old Freight Estimate tab is hidden to avoid a duplicate / misleading second entry.
- Line Clear remains local-only arithmetic: no Import sync, full render, polling, MutationObserver, or automatic network request.
- Child ID copy feedback is now inline: JL0023-1 -> 已复制 -> JL0023-1. The bottom-right copy toast was removed.
- Applies to All Individual Trees and Individual Trees child-ID display positions; existing navigation/edit controls retain their own action.
- Mobile child photo crop focus is moved upward with a direct !important selector (center 20%) while keeping frame/card dimensions unchanged.
- V5.5/V5.6 room-source and independent 5-child-per-room rules are retained.
- Apps Script / Code.gs unchanged; no redeploy required.

Deployment
- Replace the files in the Frontend folder in GitHub Pages with this patch.
- Version: V5.8 / Build 5700.

V5.8 additions:
- Sender Postcode defaults to 43300 and remains editable/savable.
- Removed numeric spinner arrows in Line Clear inputs.
- Removed Recipient Postcode helper line for cleaner alignment.
- Service defaults to Express 1-3 days and can switch to Premium Next Day Guaranteed.
- Premium uses independent Peninsular rate: RM15 first 1kg + RM3 per additional 1kg/part; eligibility checks <70cm each side and <30kg actual weight; NDA/ODA remains official-quote dependent.
