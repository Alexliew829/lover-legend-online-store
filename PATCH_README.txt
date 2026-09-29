V5.4 PATCH from V5.2
Build: 5400

Scope
- Frontend only. No Apps Script / Code.gs API change.
- Remove duplicate dashboard Import inventory summary.
- Do not add Parent Master overview to Home.
- Product Management -> Mother Product Overview is the only Parent Master summary.
- One Parent Product Master -> many Child / Random room allocations.
- VIP / Premium / Starter show Child / Random allocations only; no duplicate Parent Product card/data copy.
- Parent shared data continues to live in the existing single product editor.
- Room rows provide Child ID/status/price/edit; Starter also shows Random allocation.
- All current-version labels, VERSION, version.json, manifest and service-worker cache updated to V5.4.

Deploy
Replace Frontend files only. Apps Script / Code.gs does not require redeployment for this patch.
