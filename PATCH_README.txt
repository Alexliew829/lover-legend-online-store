Lover Legend Online Store Management Admin — V6.2 PATCH from V6.1

V6.2 changes:
- Fixes Reference Shipping manual input duplication (for example, typing 20 no longer becomes 2200).
- Manual raw input is authoritative while editing; Line Clear suggestion cannot overwrite it.
- Supports clear/retype and intermediate values such as 15., 15.0 and 15.00.
- Formats to two decimals only after leaving the field.
- Restore Suggestion remains the only path back to the current Line Clear automatic suggestion.
- No change to sync.js, cloud sync, Import read-only flow, polling or observer behavior.

Deployment:
- Replace Frontend files only.
- Apps Script / Code.gs redeployment is not required.
