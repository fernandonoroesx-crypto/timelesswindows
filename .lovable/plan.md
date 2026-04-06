

## Current State: Already Working as Requested

After reviewing the code, the system **already behaves this way**:

1. **PM with custom rates selected** → `pm.pricing` (full PricingData with both selling and cost fields) replaces the quote's pricing → both selling and cost calculations use PM rates

2. **No PM selected / PM without custom rates** → global standard pricing is used for both selling and cost

### How it works (QuoteBuilder.tsx, line 80-93):
```
selectPM(pmId):
  if PM has pricing → quote.pricing = pm.pricing  (both selling + cost)
  if no PM → quote.pricing = globalPricing         (standard rates)
```

### Pricing engine (pricing.ts):
- `getItemSellingBreakdown(item, settings, quotePricing)` — uses quotePricing for selling rates
- `getItemCostBreakdown(item, settings, quotePricing)` — uses quotePricing for cost rates

Both functions read from the same `quotePricing` object, so whichever rates are on the quote (PM or global) apply to everything.

### No changes needed

The current implementation matches your requirement. When a PM has personal rates added, those rates are used for both selling and cost. When no PM rates exist, global standard rates apply.

