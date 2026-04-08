

## Plan: Improve Excel Layout — Smaller Logo + Better Alignment

### What changes
Adjust the Excel export layout to match the uploaded reference file with a smaller logo and better text/column alignment.

### Changes in `src/lib/excel-export.ts`

**1. Smaller logo**
- Reduce logo size from `280×76` to ~`160×44` (roughly 60% smaller)
- Move position from `col: 8` to `col: 9` so it sits neatly in the top-right above the last columns

**2. Better alignment**
- Left-align text columns (Proj Ref, Item Ref, Type) instead of center-aligning everything
- Keep center alignment only for numeric columns (Qty, Width, Height) and right-align currency columns
- Left-align the title row and date row (already left, but ensure consistent padding)
- Left-align summary labels, right-align summary amounts
- Adjust column widths for better spacing: wider Type column, tighter Qty column

**3. Minor layout polish**
- Align "TOTALS" label to left instead of center
- Ensure the summary section labels are left-aligned and amounts are right-aligned for readability
- Grand total label left-aligned, amount right-aligned

### Files modified
- `src/lib/excel-export.ts`

