

## Plan: Improve Excel Report Design

### Current limitation

The current export uses SheetJS (`xlsx`), which does **not support cell styling** (colors, borders, bold, fills) in the free/community version. The report outputs plain unformatted data.

### Solution: Switch to ExcelJS

Replace `xlsx` with `exceljs` — a free library that supports full formatting: bold headers, colored fills, borders, number formatting (£), merged cells, and conditional styling.

### Design improvements

1. **Header row**: Bold white text on dark blue background, centered alignment
2. **Currency formatting**: All monetary cells display as `£#,##0.00`
3. **Totals row**: Bold with light grey background and top border
4. **Breakdown section**: Section title in bold with colored background; alternating row shading for readability
5. **Summary block** (Total Selling / Cost / Profit / Margin): Bold with green fill for profit, red fill if negative
6. **Borders**: Thin borders around all data cells; thicker border separating items from breakdown
7. **Column auto-width**: Better fit to content
8. **Project header**: Client name, date, and project ref displayed above the table in a merged-cell header area

### Files to change

| File | Change |
|---|---|
| `package.json` | Replace `xlsx` with `exceljs` |
| `src/lib/excel-export.ts` | Rewrite using ExcelJS API with full formatting |

### Key ExcelJS features used

- `worksheet.getRow(n).font = { bold: true, color: { argb: 'FFFFFF' } }`
- `worksheet.getRow(n).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2B3A67' } }`
- `cell.numFmt = '£#,##0.00'` for currency
- `cell.border = { top: { style: 'thin' }, ... }` for borders
- `worksheet.mergeCells('A1:U1')` for project header

The data logic stays the same — only the rendering layer changes to produce a professionally styled spreadsheet.

