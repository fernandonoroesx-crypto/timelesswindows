

## Plan: Fix MDF Reveal Editing in PM Pricing

### Root cause

When PM pricing is loaded from the database and merged with defaults via `{ ...DEFAULT_PRICING, ...pm.pricing }`, the spread is **shallow**. If `pm.pricing.mdfSelling` was saved as an incomplete or empty object, it replaces the full `DEFAULT_PRICING.mdfSelling` entirely, resulting in missing `narrow`/`wide` sub-objects. The `Object.entries(pricing.mdfSelling.narrow || {})` then iterates over nothing, so no editable fields appear.

### Fix

Deep-merge PM pricing with defaults so nested objects like `mdfSelling` always have the correct structure.

### Files to update

| File | Change |
|---|---|
| `src/pages/ClientsPage.tsx` | In `handleUpdatePMPricing` (line 96) and `handleEnablePMPricing` (line 75), use a deep-merge utility instead of shallow spread to ensure `mdfSelling.narrow`, `mdfSelling.wide`, and all other nested pricing objects are always fully populated |
| `src/components/PricingEditor.tsx` | Add defensive fallbacks: replace `pricing.mdfSelling.narrow || {}` with `pricing.mdfSelling?.narrow || DEFAULT_PRICING.mdfSelling.narrow` (and same for `wide`) so fields always render even if data is partially missing |

