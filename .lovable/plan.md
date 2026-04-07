

## Plan: Fix MDF Reveal Editing in PM Pricing (Comprehensive)

### Root cause

Three places fail to ensure PM pricing has the full nested structure:

1. **`handleEdit`** — loads PM pricing from DB as-is. If saved data has `mdfSelling: {}` or `mdfSelling: { narrow: {} }`, the nested keys are missing.
2. **`handleEnablePMPricing`** — uses `{ ...DEFAULT_PRICING }` (shallow copy). Nested objects like `mdfSelling` are shared references, which can cause stale data if mutated elsewhere.
3. **First edit attempt** — `handleUpdatePMPricing` uses `deepMergePricing` correctly, but the initial render before any edit shows broken/missing fields if the raw DB data is incomplete.

### Fix

| File | Change |
|---|---|
| `src/pages/ClientsPage.tsx` | **`handleEdit`**: Deep-merge each PM's pricing with `DEFAULT_PRICING` when loading a client for editing, so incomplete DB data always gets filled with defaults |
| `src/pages/ClientsPage.tsx` | **`handleEnablePMPricing`**: Use `JSON.parse(JSON.stringify(DEFAULT_PRICING))` instead of `{ ...DEFAULT_PRICING }` to deep-clone all nested objects |

### Details

**`handleEdit`** change (line 163):
```typescript
projectManagers: (client.projectManagers || []).map(pm =>
  pm.pricing
    ? { ...pm, pricing: deepMergePricing(DEFAULT_PRICING, pm.pricing) }
    : pm
),
```

**`handleEnablePMPricing`** change (line 96):
```typescript
{ ...pm, pricing: JSON.parse(JSON.stringify(DEFAULT_PRICING)) }
```

This ensures PM pricing always has the complete `mdfSelling.narrow` and `mdfSelling.wide` structure regardless of what was stored in the database.

