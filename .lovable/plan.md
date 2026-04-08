

## Plan: Fix Excel Reader Height Column Detection

### Problem
The uploaded Excel file `Batch_1.xlsx` has columns: `Item Ref | Type | Width | Hight | Price`. The header "Hight" (common misspelling of "Height") does not match the current regex `/\b(height|h)\b/i`, so the height column is never detected. Every data row is skipped because height = 0 fails the `height < 100` check, resulting in 0 items extracted.

### Fix in `src/lib/excel-reader.ts`

**1. Add "hight" to the height detection regex (line 130)**
- Change from: `/\b(height|h)\b/i`
- Change to: `/\b(height|hight|h)\b/i`

This single change will allow the parser to correctly detect the height column and extract all ~200+ items from the file.

### Files modified
- `src/lib/excel-reader.ts` — add "hight" typo variant to height header pattern

