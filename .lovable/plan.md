

## Plan: Fix Standard Pricing Fallback When PM Has No Custom Rates

### Problem

In `QuoteBuilder.tsx` line 86-93, when a PM is selected but has no custom pricing (`pm.pricing` is falsy), the code does **not** set `updates.pricing`. This means the quote retains whatever pricing was previously set — which could be stale defaults or rates from a previously selected PM. The global standard rates are not applied.

### Fix

**`src/pages/QuoteBuilder.tsx`** — In the `selectPM` function, always set pricing: use PM rates if available, otherwise fall back to `globalPricing`.

Change lines 86-93 from:
```typescript
const pm = clientPMs.find(p => p.id === pmId);
if (pm) {
  const updates: Partial<Project> = { projectManagerId: pm.id, projectManagerName: pm.name };
  if (pm.pricing) {
    updates.pricing = { ...pm.pricing };
  }
  updateProject(updates);
}
```

To:
```typescript
const pm = clientPMs.find(p => p.id === pmId);
if (pm) {
  const pricing = pm.pricing ? { ...pm.pricing } : { ...globalPricing };
  updateProject({ projectManagerId: pm.id, projectManagerName: pm.name, pricing });
}
```

This ensures that selecting a PM without custom rates always applies the current global standard pricing, and selecting a PM with custom rates applies theirs.

