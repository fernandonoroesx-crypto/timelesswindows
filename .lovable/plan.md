## Add "Simple Excel" report option

Add a new report that produces an Excel file matching the exact format of the uploaded AXI240 report — a minimal 8-column layout without cost breakdowns or summary section.

### Format spec (from AXI240 sample)

- Sheet name: `Quote Report`
- Logo top-right (anchored col G, row 1) — same logo used today, sized ~160×44
- Row 1 (merged A1:F1, h=42.75): `{ProjectRef} — {Client}` — bold 14pt, dark charcoal `#2D2D2D`
- Row 2 (merged A2:F2, h=24): `Date: {date}` — 10pt grey `#666`
- Row 4 (header, h=32): dark charcoal fill, white bold text
  Columns: `Proj Ref | Item Ref | Qty | Type | Width (mm) | Height (mm) | Unit Total | Total`
  Alignment: A/B/D left, C/E/F center, G/H right
- Column widths: A 32.3, B 9, D 14.8 (others default)
- Data rows from row 5: 11pt, alternating white / `#F2F2F2` shading, currency columns formatted `£#,##0.00`
- TOTALS row at bottom: bold, light grey fill, column C = sum of qty, column H = grand total. No medium top border, no summary breakdown, no grand-total band.
- File name: `{ProjectRef}-Simple-Report.xlsx`

### Changes

**`src/lib/excel-export.ts`**
- Add new exported function `exportSimpleQuoteExcel(project: Project)` implementing the spec above. Reuse `loadLogoAsArrayBuffer`, `getItemSellingBreakdown`, and `getProjectPricing` to compute `unitTotal` per item (selling price, same source as existing Excel Quote).
- Keep existing `exportQuoteExcel` untouched.

**`src/pages/QuoteBuilder.tsx`**
- Import `exportSimpleQuoteExcel` alongside `exportQuoteExcel`.
- In the Reports dropdown (around line 199-204), add a new `DropdownMenuItem` "Simple Excel" directly below "Excel Quote" that calls `exportSimpleQuoteExcel(project)` and toasts `Simple Excel exported`.

### Out of scope
- No change to existing Excel Quote, PDF reports, pricing logic, or data model.
