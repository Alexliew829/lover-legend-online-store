Lover Legend Online Store Management Admin — V6.3 PATCH from V6.2

V6.3 changes:
- Unified RM money input controller for Online Store editable money fields.
- Full-width Chinese IME digits normalize correctly: ５８０ -> 580.00; １２００ -> 1,200.00.
- No duplicate concatenation such as 20 -> 2200.
- Editing remains raw while typing; comma + 2-decimal formatting happens only on blur/save.
- Reference Shipping keeps Line Clear suggestion separate from manual adopted value.
- V6.0 stable sync/runtime path preserved; no new sync/fetch/observer/polling logic.

Deployment: replace Frontend only. Apps Script / Code.gs redeploy is not required.
