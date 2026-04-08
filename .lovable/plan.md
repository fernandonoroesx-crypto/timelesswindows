

## Plan: Add Excel File Import Alongside PDF Import

### Overview
Extend the existing import dialog to accept both PDF and Excel (.xlsx/.xls) files. The Excel reader will parse spreadsheets with supplier line-item data (dimensions, prices, types) and map them to `ExtractedLineItem[]`, just like the PDF reader does.

### Changes

**1. Create `src/lib/excel-reader.ts`**
- Use the `xlsx` npm package (SheetJS) to parse uploaded Excel files in the browser
- Export an `extractExcelItems(file: File): Promise<PdfExtractionResult>` function returning the same `PdfExtractionResult` shape (rawText, pages, items)
- Auto-detect columns by header matching: look for headers containing "width", "height", "price", "qty", "type", "ref" (case-insensitive)
- Fallback: scan for numeric columns in the 200–3000mm range for dimensions, currency values for prices
- Reuse `ExtractedLineItem` type from `pdf-reader.ts`
- Detect currency (GBP/EUR) from cell formatting or header text

**2. Update `src/components/PdfImportDialog.tsx`**
- Rename component to `FileImportDialog` (update exports and imports)
- Change file accept from `.pdf` to `.pdf,.xlsx,.xls`
- On file selection, detect type by extension:
  - `.pdf` → existing `extractPdfText()` flow + PDF price stripping
  - `.xlsx/.xls` → new `extractExcelItems()` flow (no PDF stripping needed)
- Update button label from "Import PDF" to "Import File" and icon stays `FileUp`
- Update dialog title accordingly
- Raw text tab shows spreadsheet data as tab-separated text for Excel files

**3. Update `src/pages/QuoteBuilder.tsx`**
- Update import reference from `PdfImportDialog` to `FileImportDialog`

**4. Install `xlsx` package**
- `npm install xlsx` — client-side spreadsheet parsing library

### Files created/modified
- `package.json` — add `xlsx` dependency
- `src/lib/excel-reader.ts` — new Excel parsing logic
- `src/components/PdfImportDialog.tsx` → renamed to `FileImportDialog`, extended for Excel
- `src/pages/QuoteBuilder.tsx` — update import name

