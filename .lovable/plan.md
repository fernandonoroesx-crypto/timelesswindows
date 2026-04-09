

## Plan: Add Manual Currency Toggle to Line Items

### Current behavior
The currency (EUR/GBP) is set **automatically** based on the selected supplier. If no supplier is chosen, it defaults to GBP. The conversion already works in the pricing engine — EUR prices are multiplied by the `eurToGbpRate` from the header settings.

### What this adds
A small **currency toggle** (EUR / GBP) next to the Price field on each line item, so you can manually set the currency regardless of supplier selection. When a supplier is selected, it still auto-sets the currency, but you can override it.

### Changes

**`src/pages/QuoteBuilder.tsx`**
1. Add a compact EUR/GBP toggle (Select dropdown or toggle group) next to the Price input, sharing the same row
2. The toggle updates `item.manufactureCurrency` directly
3. When a supplier is selected, currency still auto-fills but can be manually changed afterward
4. The Price label continues showing the active currency: "Price (EUR)" or "Price (GBP)"

No pricing engine changes needed — the conversion logic already exists and works correctly with the per-quote `eurToGbpRate`.

### Files modified
- `src/pages/QuoteBuilder.tsx` — add currency selector next to Price field

