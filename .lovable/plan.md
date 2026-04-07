

## Plan: Add MCD (Main Contract Discount) to Quote Summary

### What it does

Adds a percentage discount field ("MCD %") in the Quote Summary header (next to Est. Days). The discount applies to the total selling price, and the discounted total is shown in the summary cards.

### Changes

#### 1. `src/lib/types.ts` — Add `mcdPercent` to `ProjectSettings`
- Add `mcdPercent: number` (default 0)

#### 2. `src/lib/context.tsx` — Add default `mcdPercent: 0` to `createNewProject`

#### 3. `src/pages/QuoteBuilder.tsx`
- Add MCD % input field in the Quote Summary header (next to Est. Days), styled the same way
- After computing `summary`, calculate `mcdAmount = summary.sellingPrice.total * (mcdPercent / 100)`
- Add an "MCD (X%)" row to `summaryRows` showing the discount as a negative selling value
- Update the Selling Price summary card to show the discounted total
- Recalculate profit and margin based on discounted selling price

### How it works

```text
MCD = 10%
Selling Total = £50,000
MCD Amount = £5,000
Discounted Selling = £45,000
Profit = £45,000 - Cost
Margin = Profit / £45,000 × 100
```

### Files to update

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `mcdPercent` to `ProjectSettings` |
| `src/lib/context.tsx` | Add default value |
| `src/pages/QuoteBuilder.tsx` | Add input field, discount row, adjust totals |

