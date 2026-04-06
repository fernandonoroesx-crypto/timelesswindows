

## Plan: Re-add Pricing Tab to Quote Builder (Read-only with Override)

### What changed

The Pricing tab was removed entirely. The user wants it back so they can still view and adjust rates on a specific quote if needed.

### Changes

**`src/pages/QuoteBuilder.tsx`**

1. Re-import `PricingEditor` and the `SlidersHorizontal` icon
2. Add back the `updatePricing` function that updates `project.pricing` fields
3. Add the "Pricing" `TabsTrigger` and `TabsContent` back into the Tabs component, rendering `PricingEditor` with the quote's current pricing

The pricing tab will show the current rates applied to the quote (from global settings or PM). If the user edits a value, it overrides just that quote — matching the original behavior but now with the correct baseline rates already loaded from settings/PM.

### Files to change

| File | Change |
|---|---|
| `src/pages/QuoteBuilder.tsx` | Re-add `PricingEditor` import, `updatePricing` function, and Pricing tab UI |

