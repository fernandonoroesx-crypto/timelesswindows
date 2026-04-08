

## Plan: Extract Glass Thickness from Supplier PDFs

### What it does
Adds glass thickness detection to the PDF reader. The thickness is calculated by summing the numeric parts of the glass specification string found in field "4. Glass:" — e.g. `4Tgh-6Ar-4TghLowE` → 4+6+4 = **14mm**. This value is stored per item and displayed in the import dialog and Extract to Excel output.

### How it works
The glass spec follows a pattern like `4Tgh-6Ar-4TghLowE` or `6-16Ar-6LowE` — numbers separated by dashes with text suffixes. We extract all leading numbers from each dash-separated segment and sum them.

### Changes

**`src/lib/pdf-reader.ts`**
- Add `glassThicknessMm?: number` and `glassSpec?: string` to `ExtractedLineItem` interface
- Add `detectGlassSpec(text)` function that finds field "4. Glass:" and extracts the parenthesized spec (e.g. `4Tgh-6Ar-4TghLowE`)
- Add `calcGlassThickness(spec)` function that sums numeric prefixes from dash-separated segments
- Call these in `parseSupplierFormat` using the preceding text context (same as type detection)

**`src/lib/excel-reader.ts`**
- Add header detection for "glass" / "glass thickness" columns in `detectColumns`
- Map to `glassThicknessMm` on extracted items

**`src/lib/types.ts`**
- Add `glassThicknessMm?: number` and `glassSpec?: string` to `QuoteLineItem`

**`src/components/PdfImportDialog.tsx`**
- Show glass thickness in the extracted items preview grid
- Pass through to `QuoteLineItem` on import

**`src/pages/PdfEditorPage.tsx`**
- Add "Glass (mm)" column to the Extract to Excel preview table and Excel output

### Files modified
- `src/lib/pdf-reader.ts` — add glass detection logic + interface field
- `src/lib/excel-reader.ts` — add glass column detection
- `src/lib/types.ts` — add optional glass fields to QuoteLineItem
- `src/components/PdfImportDialog.tsx` — display + pass through glass data
- `src/pages/PdfEditorPage.tsx` — include in Excel extract output

