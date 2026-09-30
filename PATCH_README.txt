Lover Legend Online Store V9.2 - V8.3 UI + Fast Core

Base: V9.1
Import source: V42.8 Read-Only

Deployment:
- Replace the complete Frontend folder / repository root with this package.
- No Import Apps Script / Code.gs change is required.
- After GitHub Pages deploy, hard refresh once so the V9.2 service worker/cache becomes active.

V9.2 performance changes:
- Keeps V8.3/V9.1 UI, layout, formulas and existing Online Store feature functions.
- Removes the old 0-7.7 second staggered startup setup chain.
- Uses one consolidated boot: priority interactions first, non-critical polish in idle slices.
- Local-First mirror paints before cloud work.
- Online Import revision polling reduced from ~1.5 seconds to ~30 seconds.
- Service worker navigation is cache-first with background refresh.
- Regular stylesheet load restored for deterministic first interaction.
- Import V42.8 remains read-only; no Online -> Import write path added.
