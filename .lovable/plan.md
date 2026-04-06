

## Plan: Fix New Quote Pricing Initialization

### Problem

When creating a new quote, the pricing should snapshot the current global Settings (both selling and cost rates). Once saved, that quote keeps its snapshot forever — future Settings changes don't affect it.

The current code already attempts this but has a race condition: `createNewProject()` runs before `globalPricing` is fetched from the database, so it captures `DEFAULT_PRICING` (hardcoded defaults) instead of the user's saved Settings.

### Current flow (buggy)

1. `useState` initializer calls `createNewProject()` → sets `pricing = globalPricing`
2. But `globalPricing` is still `DEFAULT_PRICING` at this point (DB fetch is async)
3. Effect at line 47-51 tries to fix this, but only runs if `!currentProject && !project.projectManagerId`

### Fix

**1. `src/pages/QuoteBuilder.tsx`** — Strengthen the initialization sync:

- Keep the existing effect that syncs `globalPricing` for new quotes (line 47-51)
- Add a guard so this sync only runs **once** when `globalPricing` first loads from DB, not on every subsequent render
- Use a ref (`hasInitializedPricing`) to track whether the new quote has received its DB-loaded pricing
- For existing quotes (`currentProject` is set), never overwrite — they keep their saved snapshot

```text
New quote flow:
  1. Create with DEFAULT_PRICING (placeholder)
  2. globalPricing loads from DB → sync once → set flag
  3. Quote now has correct Settings rates
  4. On save → snapshot is persisted
  5. Future Settings changes don't affect this saved quote
```

### Changes

| File | Change |
|---|---|
| `src/pages/QuoteBuilder.tsx` | Add `useRef` flag to ensure new quotes get DB-loaded global pricing exactly once; existing quotes are never overwritten |

### What stays the same

- Existing/saved quotes keep their pricing snapshot untouched
- PM-assigned quotes use PM pricing
- Deselecting a PM reverts to current global pricing
- Per-item overrides (installation override, custom uplift) are preserved

