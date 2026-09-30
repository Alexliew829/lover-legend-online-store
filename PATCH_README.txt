Lover Legend Online Store V6.4 PATCH from V6.3

Scope:
- Fix reference shipping manual input so raw typing is never reformatted or duplicated during input.
- 20 stays 20 while editing and commits to 20.00 on Enter/blur.
- 1200 commits to 1,200.00; full-width numeric input is normalized on commit.
- All editable RM money inputs support Enter = commit/format without form submit or navigation.
- Line Clear suggestion remains separate; Restore Suggestion remains the only explicit return to auto recommendation.
- No changes to sync.js, polling, observers, fetch, Import sync, Apps Script or backend APIs.

Stable rollback baseline remains V6.0.
Frontend only. Apps Script / Code.gs does not need redeployment.
