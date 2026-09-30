Lover Legend Online Store Management Admin V9.0 Clean Rebuild
==============================================================

Import reference: LL Import Cost & Inventory V42.8 (read-only)
Online Store does NOT write to Import.

Why V9.0:
- V8.x accumulated duplicate event handlers, fallback navigation, repeated subview state, and large inherited Import frontend code.
- V9.0 rewrites the Online Store frontend with one router, one delegated click/input chain, in-memory state cache, explicit saves, and read-only Import sync.

Core rules included:
1. Product Overview: VIP / Premium / Starter + other categories.
2. Remove Room always returns to Product Overview.
3. Manage Template always opens Bonsai Content Templates.
4. Template keywords use OR matching (e.g. 凌珊 Bluebell => 凌珊 OR Bluebell).
5. Product Details + Care Guide remain visible inside room editor and auto-match templates.
6. Clearing Template Name immediately clears keyword/description/care form fields only; saved template remains until Delete.
7. Import stock=1 forces Parent Direct (Variations disabled).
8. Import stock>1: Variations OFF = Parent Direct; ON = Individual Trees + Random.
9. Individual Trees maximum 10; 1 tree can save/publish.
10. Random quantity 1-10; 1 can save/publish.
11. Child and Random Publish/Unpublish are independent and are beside their Save buttons.
12. Child/Random price > mother price: immediate warning + blocks save/publish.
13. Child/Random price < Online protection floor: immediate warning; publishing asks confirmation.
14. Package Reserve always participates in shipping estimation, regardless of payer.
15. Buyer-pays shipping is excluded from Online total cost; seller-paid shipping is included.
16. Product shipping override means the opposite of the store default.
17. Affiliate / Payment Fee / shipping bearer / margin settings immediately refresh the open product calculation after save.
18. Online Pot Cost is editable and immediately recalculates costs.
19. Target margin Reset factory: 30 / 35 / 40 / 45 / 50 / 60.
20. VND Pot Reset factory: 35 / 55 / 105 / 180.
21. Actual net margin UI uses 2 decimals; calculations retain normal JS numeric precision.
22. No polling interval, no MutationObserver, no Full Sync, no Import writes.

Migration:
- V9.0 migrates old llaOnlineStoreV22::state, llaOnlineStoreV22::ui and onlineStoreContentTemplatesV41 on first launch.
- The old keys are left untouched as rollback data.

Deploy:
- Replace Online Store frontend files with this Frontend folder.
- No Apps Script change is required.
- Import V42.8 Apps Script remains the read-only source.
- After first deploy, hard refresh once so the V9.0 service worker cache becomes active.
