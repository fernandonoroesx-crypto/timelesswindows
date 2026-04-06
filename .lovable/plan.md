

## Plan: Lock Quote Rates to Global Settings (Override Only by PM)

### Problem

The Quote Builder has a "Pricing" tab that lets users manually edit selling rates per-quote. This contradicts the requirement that rates should always match global Settings, only changing when a PM has custom rates assigned.

### Changes

**`src/pages/QuoteBuilder.tsx`**

1. **Remove the Pricing tab** from the quote builder tabs. Users should not be able to edit rates on individual quotes — rates come from Settings (standard) or PM (custom).

2. **Remove the `updatePricing` function** (lines 59-70) and the `QuotePricingEditor` component (lines 496-498) since they are no longer needed.

3. **Remove the pricing tab trigger and content** (the "Pricing" `TabsTrigger` and `TabsContent` on lines 444-446).

### What stays the same

- Global Settings page: full editing of all selling and cost rates (standard rates)
- PM pricing on Clients page: selling-only overrides per PM
- Quote pricing resolution: PM rates if PM has custom rates → global standard rates otherwise
- The `project.pricing` field still stores a snapshot of whichever rates applied when the quote was created/PM was selected, so saved quotes retain their historical rates

### Files to change

| File | Change |
|---|---|
| `src/pages/QuoteBuilder.tsx` | Remove Pricing tab, `updatePricing` function, and `QuotePricingEditor` component |

