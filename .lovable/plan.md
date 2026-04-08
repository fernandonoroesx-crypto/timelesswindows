

## Plan: Rename PDF Editor to PDF Options with Two Modes

### What it does
Renames "PDF Editor" to "PDF Options" in the sidebar and page, then adds two selectable modes:
1. **Remove Prices** — the existing functionality (upload PDF, strip prices via edge function, download clean PDF)
2. **Extract to Excel** — upload a supplier PDF, extract all line item data (ref, type, qty, width, height, price, uplift, installation, etc.) using the existing `extractPdfText` from `pdf-reader.ts`, then export the extracted items as a downloadable `.xlsx` file

### Changes

**`src/components/AppLayout.tsx`**
- Change nav label from `'PDF Editor'` to `'PDF Options'`

**`src/pages/PdfEditorPage.tsx`** — rewrite with two-mode UI
- Add a mode selector (tabs or radio) at top: "Remove Prices" | "Extract to Excel"
- **Remove Prices mode**: keep existing upload + process + preview + download flow (unchanged logic)
- **Extract to Excel mode**: 
  - Same drag-and-drop upload area for PDF files
  - On "Extract Data", call `extractPdfText(file)` from `pdf-reader.ts` to parse all line items
  - Display extracted items in a preview table (Item Ref, Type, Qty, Width, Height, Price, Currency, Uplift, Installation)
  - "Download Excel" button generates an `.xlsx` using the `xlsx` library (already in project) with all extracted columns
  - Uses the same `ExtractedLineItem` interface so data is consistent with what the quote import produces

### Files modified
- `src/components/AppLayout.tsx` — rename nav label
- `src/pages/PdfEditorPage.tsx` — add tabs for two modes, add Extract to Excel flow

