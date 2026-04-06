

## Plan: Ensure New Quotes Always Use Saved Global Pricing

### Problem

When creating a new quote, the pricing is set from `globalPricing` — but this value is still the hardcoded `DEFAULT_PRICING` at that moment because the database fetch hasn't completed yet. So the quote gets stale default rates instead of the user's saved settings rates.

### Fix

**`src/pages/QuoteBuilder.tsx`** — Add a `useEffect` that syncs the project's pricing with `globalPricing` once it finishes loading, but only for new projects (no PM selected, no existing custom pricing from a saved quote).

```typescript
// After globalPricing loads, apply it to new unsaved projects
useEffect(() => {
  if (!currentProject && !project.projectManagerId) {
    setProject(prev => ({ ...prev, pricing: { ...globalPricing } }));
  }
}, [globalPricing]);
```

This ensures:
- New quotes pick up saved global settings rates (both selling and cost)
- Existing quotes keep their saved pricing
- PM-assigned quotes keep their PM pricing

### Files to change

**`src/pages/QuoteBuilder.tsx`** — Add one `useEffect` (~5 lines) after the existing `useEffect` on line 40-42.

