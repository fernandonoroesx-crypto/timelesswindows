

## Plan: Add Excel Report Export to Quotes

### What the user wants

An Excel (.xlsx) export from the Quote Builder that matches their draft layout, with a total breakdown section at the bottom.

### Draft layout (from uploaded file)

Columns: **Proj Ref, Item Ref, Qty, Type, Width (mm), Height (mm), Material, Internal Making Good, External Making Good, Waste Disposal, Extra1, Extra2, Extra3**

Plus a **total breakdown** section below the items table summarizing all cost categories.

### Implementation

**New file: `src/lib/excel-export.ts`**

- Function `exportQuoteExcel(project: Project)` that:
  1. Uses the `xlsx` (SheetJS) library to build a workbook in-browser
  2. Creates a sheet with header row matching the draft columns
  3. Populates one row per line item using `getItemSellingBreakdown()` for selling values
  4. Adds a **totals row** summing each column
  5. Adds a **breakdown section** below with:
     - Materials total, Installation total, Internal Making Good, External Making Good, Architrave, Trims, MDF Reveal, Waste Disposal, Delivery/Stock, FENSA/Survey, Extras
     - Selling total, Cost total, Profit, Margin %
  6. Applies column widths and basic formatting
  7. Triggers browser download as `.xlsx`

**`src/pages/QuoteBuilder.tsx`**

- Add an "Export Excel" button next to the existing PDF export buttons
- Import and call `exportQuoteExcel`

**Package**

- Install `xlsx` (SheetJS) — works client-side, no server needed

### Technical details

| File | Change |
|---|---|
| `package.json` | Add `xlsx` dependency |
| `src/lib/excel-export.ts` | New file — builds workbook with items table + breakdown |
| `src/pages/QuoteBuilder.tsx` | Add Excel export button |

### Column mapping from draft to data

| Excel Column | Source |
|---|---|
| Proj Ref | `project.projectRef` |
| Item Ref | `item.itemRef` |
| Qty | `item.qty` |
| Type | `item.type` |
| Width (mm) | `item.widthMm` |
| Height (mm) | `item.heightMm` |
| Material | `breakdown.material` |
| Internal Making Good | `breakdown.internalMakingGood` |
| External Making Good | `breakdown.externalMakingGood` |
| Waste Disposal | `breakdown.wasteDisposal` |
| Extra1 | `item.extra1` value from `pricing.extras` |
| Extra2 | `item.extra2` value from `pricing.extras` |
| Extra3 | `item.customExtra` |

### Breakdown section (below items)

- Selling: Material, Installation, Int. Making Good, Ext. Making Good, Architrave, Trims, MDF, Waste, Delivery, FENSA, Extras → **Total Selling**
- Cost: same categories + Consumables + Overhead → **Total Cost**
- Profit and Margin %

