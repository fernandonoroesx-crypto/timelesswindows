

## Plan: Store Original & Cleaned Supplier PDF, Add to Reports Dropdown

### What this does
When you import a supplier PDF, the system stores both the original PDF and a price-stripped copy. The Reports dropdown gets two new options: "Supplier PDF (Original)" to view/download the original, and "Supplier PDF (No Prices)" to download the cleaned version.

### Changes

**1. Add PDF storage fields to Project type** (`src/lib/types.ts`)
- Add `supplierPdfOriginal?: string` (base64), `supplierPdfClean?: string` (base64), `supplierPdfName?: string`

**2. Create price-stripping utility** (`src/lib/pdf-price-strip.ts` — new file)
- Takes a PDF as `ArrayBuffer`, uses `pdfjs-dist` to locate price text coordinates (reusing regex patterns from `pdf-reader.ts`: `NUMBER,-`, `£/€ NUMBER`, dimension-adjacent prices)
- Uses `pdf-lib` (new dependency) to load the same PDF and draw white rectangles over price regions
- Returns cleaned PDF as base64

**3. Update PdfImportDialog** (`src/components/PdfImportDialog.tsx`)
- Add callback prop `onPdfFiles?: (original: string, clean: string, fileName: string) => void`
- After file upload, convert original to base64 and run price-strip, then call the callback

**4. Update QuoteBuilder** (`src/pages/QuoteBuilder.tsx`)
- Pass `onPdfFiles` to `PdfImportDialog`, store results on project state
- Add two new items to Reports dropdown:
  - **Supplier PDF (Original)** — downloads the stored original PDF
  - **Supplier PDF (No Prices)** — downloads the price-stripped PDF
- Both disabled/hidden when no supplier PDF has been imported

**5. Install dependency**
- Add `pdf-lib` package

### Files modified
- `package.json` — add `pdf-lib`
- `src/lib/types.ts` — 3 new optional fields on `Project`
- `src/lib/pdf-price-strip.ts` — new file
- `src/components/PdfImportDialog.tsx` — emit PDF data via new callback
- `src/pages/QuoteBuilder.tsx` — store PDFs, add 2 dropdown items

