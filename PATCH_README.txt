Lover Legend Online Store Management Admin — V6.1 PATCH from V6.0

V6.1 changes:
- Fix reference shipping manual-edit race: Line Clear suggestion can no longer overwrite the value while the user is typing.
- Line Clear suggestion and adopted/manual reference shipping remain separate.
- Manual states such as blank, 1, 15. are preserved while editing; blur commits the value cleanly.
- Restore Suggestion is the explicit path back to the current Line Clear suggested fee.
- Line Clear input order is now Package Size L → W → H → Actual Weight.
- No sync engine, polling, observer, fetch, Apps Script, Import read-only, Sold history, orders, payments or audit logic changes.

Deployment:
Replace Frontend files only. Apps Script / Code.gs does not need redeployment.
