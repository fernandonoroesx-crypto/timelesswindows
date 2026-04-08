

## Plan: Fix Extras Display in Quote Breakdown

### Problem
There is a **duplicate "Extras" row** in the per-item selling breakdown (lines 909-910 both render the same row), causing extras to appear twice visually.

### Fix

**`src/pages/QuoteBuilder.tsx`** (line 910)
- Remove the duplicate line `{sellingBreakdown.extras > 0 && <FormulaRow label="Extras" value={sellingBreakdown.extras} />}` — it appears twice in a row at lines 909 and 910. Delete line 910.

### Files modified
- `src/pages/QuoteBuilder.tsx` — remove duplicate Extras row in selling breakdown

