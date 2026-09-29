Lover Legend Online Store V6.0 PATCH from V5.9
Build 6000

V6.0 Line Clear Reference Shipping
- Product page "参考运费（RM）" now defaults to a local Line Clear Express estimate when standard package size + weight are available.
- Example: a 30 x 30 x 45 cm / 5 kg package in Peninsular Express calculates 6.75 kg volumetric / 7 kg billing and RM13.78 including 6% SST under the current local rate table.
- Reference shipping remains editable: user may change RM13.78 to RM15.00 for practical customer quoting.
- Manual edits are explicitly marked "手动调整" and are stored per mother product.
- "恢复建议值" returns the field to the current Line Clear suggestion.
- Existing V5.9 shippingCost values are NOT silently treated as manual overrides. Only an explicit V6.0 manual edit sets shippingCostManual=true.
- A-E remains packaging tier guidance / fallback only. When Line Clear cannot produce a standard estimate (for example Oversize), A-E can still provide a fallback reference.
- Buyer-paid reference shipping remains excluded from Online protection floor and actual product profit. Only seller-paid shipping enters seller cost.
- Child/item package calculations use the same local Line Clear estimate logic when complete dimensions and weight are available.

Performance & Runtime Cleanup (integer V6.0)
- No new cloud sync, fetch, polling, MutationObserver or full-page render path was added.
- Line Clear reference calculations are local arithmetic only.
- sync.js is intentionally unchanged from V5.9.
- Cleanup does not touch Sold history, orders/payments, Import sync records, Audit Log or permanent Child history.

Existing V5.9 features retained
- A-E packaging tiers based on real shipment shapes and orientation-independent dimension matching.
- Sender postcode default 43300, editable.
- Express default + Premium selectable.
- Child ID inline copy feedback (ID -> 已复制 -> ID), no bottom-right toast.
- Mobile Individual Trees photo focal position adjustment.

Deployment
- Frontend PATCH only. No Apps Script / Code.gs redeploy is required.
- Replace the Frontend files from this ZIP and deploy GitHub Pages as usual.
