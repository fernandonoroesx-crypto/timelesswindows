

## Plan: Consolidate Excel Report Columns

### Changes

**1. Rename "Excel Report" to "Excel Quote" in dropdown** (`src/pages/QuoteBuilder.tsx`)
- Change the dropdown label from "Excel Report" to "Excel Quote"
- Change the toast message accordingly

**2. Consolidate columns in the Excel export** (`src/lib/excel-export.ts`)

Current 13 value columns → reduced to 5 value columns:

| Current columns | New columns |
|---|---|
| Material | **Material** (unchanged) |
| Installation, Int. Making Good, Ext. Making Good, Architrave, Trims, MDF Reveal | **Labour** (sum of all six) |
| Waste Disposal | **Waste Disposal** (unchanged) |
| Extra1, Extra2, Custom Extra | **Extras** (sum of all three) |
| Unit Total, Total | **Unit Total, Total** (unchanged) |

New headers: `Proj Ref, Item Ref, Qty, Type, Width (mm), Height (mm), Material, Labour, Waste Disposal, Extras, Unit Total, Total` — 12 columns total.

Per-row values will sum the consolidated fields. Totals row and summary section remain the same (already grouped this way). Merge cells in header row updated to match new column count. Column widths adjusted.

### Files modified
- `src/pages/QuoteBuilder.tsx` — rename dropdown item
- `src/lib/excel-export.ts` — consolidate columns

