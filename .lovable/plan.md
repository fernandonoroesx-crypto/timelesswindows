

## Plan: Add "Apply" Button to Pricing Tab

### What it does
When editing the Pricing table in a quote, changes are staged in a draft and only applied to all line items when the user clicks "Apply Changes". This prevents accidental recalculations while still allowing bulk rate adjustments. Individual item-level overrides (price, currency, uplift) continue to work immediately as they do now.

### How it works
- Quote starts with default/PM rates (current behavior, unchanged)
- Opening the Pricing tab creates a local draft copy of the pricing data
- Edits in the pricing table only modify the draft — no live recalculation
- "Apply Changes" button commits the draft to the project pricing and triggers recalculation
- "Discard" button resets the draft back to current saved pricing
- A subtle indicator shows when there are unapplied changes

### Changes

**`src/pages/QuoteBuilder.tsx`**
1. Add `draftPricing` state, initialized from `quotePricing` when the Pricing tab is opened
2. Pass `draftPricing` + a draft updater to `PricingEditor` instead of the live pricing
3. Add "Apply Changes" and "Discard" buttons below the PricingEditor
4. "Apply" copies draft into project pricing via `updateProject`; "Discard" resets draft
5. Disable "Apply" when draft matches current pricing (JSON comparison)
6. Show a small "Unsaved changes" banner when draft differs

### Files modified
- `src/pages/QuoteBuilder.tsx`

