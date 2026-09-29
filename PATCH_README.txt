Lover Legend Online Store V5.6 PATCH from V5.5
Build 5600

Key updates
- Performance-safe patch only; no V5.4 parent/room architecture rewrite is included.
- All read-only Child IDs can be clicked to copy with a lightweight "已复制" toast.
- Individual Trees child ID now copies on click; photo and Edit buttons keep the editor open/collapse action.
- All Individual Trees carries the child's actual room into the product editor.
- Clicking Starter / Premium / VIP room label from a child row opens that child with the same room selected.
- Starter / Premium / VIP each calculate the 5-active-child limit independently. One full room no longer blocks another room.
- Existing V5.2 Affiliate, pricing, save/dirty/safe-navigation, inheritance and sync logic are retained.
- No new polling, MutationObserver, full Import sync, revision loop, or network request was added.

Deployment
- Replace the files in the Frontend folder in GitHub Pages with this patch.
- Apps Script / Code.gs: no change; no redeploy required.
- Version: V5.6 / Build 5600.


V5.6 changes:
- Added Line Clear Postage Calculator inside Logistics Management > Freight Estimate.
- Local-only calculation: no Import sync, no full render, no polling/observer/network request.
- Uses April 2026 Line Clear Express reference rate structure; shows SST, chargeable weight and Oversize warning.
- Compares Line Clear estimate with existing Online A-E freight tier without overwriting A-E settings.
- Saves only default sender postcode when user explicitly presses Save Default.
- Mobile child-card photo crop focus moved upward via CSS only.
- Apps Script / Code.gs unchanged.
