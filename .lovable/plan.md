

## Plan: Add "Apply PM Rates" Button to Pricing Tab

### What it does
Adds a button in the Pricing tab that lets users re-apply the selected Project Manager's custom pricing to the quote. If no PM is selected or the PM has no custom pricing, the button is hidden — the user keeps whatever rates they've manually entered.

### Changes

**`src/pages/QuoteBuilder.tsx`**

1. Add a helper function `applyPmRates()` that finds the selected PM, merges their `pm.pricing` into the quote via `normalizePricingData()`, and shows a success toast.

2. In the Pricing `TabsContent` (line ~555-558), add a header row above the `PricingEditor` with:
   - A label showing which PM's rates would be applied (e.g. "PM: John Smith")
   - A "Apply PM Rates" button (with a `RefreshCw` or `UserCog` icon) — only visible when `project.projectManagerId` is set AND that PM has custom `pricing` defined
   - Clicking it overwrites the quote's selling-side pricing fields with the PM's rates
   - A toast confirms: "Applied rates from [PM name]"

### No other files modified
The PM pricing data already exists on the client objects; this is purely a UI interaction in QuoteBuilder.

