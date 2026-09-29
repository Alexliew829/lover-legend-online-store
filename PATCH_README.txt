Lover Legend Online Store V5.9 PATCH from V5.8
Build 5900

V5.9 verified changes
- Reworked Online A-E package size tiers from real Line Clear shipment dimensions supplied by the user.
- A Small: 50 x 30 x 30 cm, 5 kg.
- B Medium-Small: 65 x 45 x 45 cm, 15 kg.
- C Medium-Large: 80 x 60 x 60 cm, 35 kg.
- D Large: 100 x 75 x 60 cm, 55 kg.
- E Oversize: 120 x 100 x 90 cm, 75 kg.
- Existing RM reference freight values are preserved (A 20 / B 50 / C 80 / D 120 / E 180) because the supplied waybills show dimensions and service class, not final billed postage.
- Freight matching now normalizes the three package dimensions from longest to shortest before tier comparison, so rotating L/W/H does not change the matched tier.
- Existing V5.8 saved tier dimensions are upgraded in-memory to the V5.9 tier shape while preserving each saved RM cost. Custom non-legacy tier dimensions remain untouched.
- Line Clear Weight / L / W / H inputs are now text + numeric keyboard inputs, fully removing browser spinner arrows on Chrome/Edge/Firefox/mobile.
- Sender postcode remains default 43300 and editable.
- Express remains default service; Premium remains selectable with its independent algorithm.
- Line Clear estimator stays local arithmetic only: no Import sync, full render, polling, MutationObserver, or automatic network request.
- Child inline copy feedback and mobile child photo focus from V5.8 are retained.
- Apps Script / Code.gs unchanged; no redeploy required.

Deployment
- Replace the Frontend files in GitHub Pages with this patch.
- Version: V5.9 / Build 5900.
