

## Plan: Fix Quote Pricing Initialization from Settings

### Problem

The current fix uses `globalPricing !== DEFAULT_PRICING` (reference equality) to detect when DB pricing has loaded. This fails when the user's saved settings happen to match defaults or when no settings are saved — because `fetchGlobalPricing` returns the same `DEFAULT_PRICING` reference, so the sync never triggers.

### Solution

Use the `loading` flag from context instead of comparing object references. Don't initialize pricing until data has finished loading.

### Changes

| File | Change |
|---|---|
| `src/pages/QuoteBuilder.tsx` | Pull `loading` from `useApp()`. Replace the ref-based pricing sync with a simpler approach: when `loading` becomes `false` and it's a new quote (no `currentProject`), set `project.pricing = globalPricing`. Use `loading` as the reliable signal that DB data is ready. |

### Updated logic

```text
New quote:
  1. While loading → project has DEFAULT_PRICING (placeholder)
  2. loading becomes false → globalPricing is now DB values
  3. Effect fires once → sets project.pricing = globalPricing
  4. hasInitializedPricing ref prevents re-runs
  5. On save → snapshot persisted, future Settings changes don't affect it

Existing quote:
  - hasInitializedPricing starts as true → effect never fires
  - Quote keeps its saved snapshot

PM assigned:
  - PM pricing applied via selectPM handler (unchanged)
```

### What stays the same

- Existing quotes keep their saved pricing snapshot
- PM pricing overrides work as before
- Deselecting PM reverts to current global pricing
- Per-item overrides preserved

