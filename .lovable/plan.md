

## Plan: Show Currency on Price Field and Add EUR→GBP Rate Input

### What it does
1. Shows the current currency next to the Price label in each line item (e.g. "Price (EUR)" or "Price (GBP)") so the user always knows which currency they are entering
2. Adds an "EUR → GBP Rate" input field in the Quote Builder header settings area (next to MCD % and Est. Days) so the rate can be adjusted per quote

### Changes

**`src/pages/QuoteBuilder.tsx`**

1. **Price label** (~line 760): Change `"Price"` to dynamically show `Price (${item.manufactureCurrency})` so the currency is always visible

2. **EUR→GBP Rate input** (~line 294, in the header settings bar next to MCD % and Est. Days): Add a new bordered input field:
   - Label: "EUR → GBP"
   - Number input bound to `project.settings.eurToGbpRate`
   - Default value: 0.90
   - Step: 0.01
   - Same compact styling as the existing MCD % and Est. Days inputs

### Files modified
- `src/pages/QuoteBuilder.tsx` — two small additions

