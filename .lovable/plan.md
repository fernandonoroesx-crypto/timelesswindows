

## Plan: Automate Supplier PDF Editing (Remove Prices + Add Logo/Footer)

### What you do manually today
Looking at your Before/After PDFs, you:
1. Remove the "Price, EUR" and "Total, EUR" columns from the pricing table (keeping Size, Area, Quantity)
2. Remove the "Order No." prefix from the header
3. Add the Timeless Windows logo to the top-right
4. Add a footer with "Timeless Windows Ltd 2 New Kings Rd London SW6 4SA" and page numbers ("1 of 3")

### What changes
Upgrade the `stripPricesFromPdf` function so the "cleaned" PDF matches your manual edits — not just whiting out prices, but also branding it with your logo and footer.

### Changes

**1. Improve price redaction (`src/lib/pdf-price-strip.ts`)**
- Current approach whites out detected price text but misses column headers ("Price, EUR", "Total, EUR")
- Add explicit patterns to also redact the column header text "Price, EUR" and "Total, EUR" (both the header labels and the data values)
- Expand the redaction to cover the full table cells, not just the number text

**2. Add logo overlay (`src/lib/pdf-price-strip.ts`)**
- After redacting prices, fetch `/images/timeless-logo.png` and embed it in the top-right corner of page 1 using pdf-lib's `embedPng` and `drawImage`
- Position it similarly to your After PDF (top-right, ~60mm wide)

**3. Add footer to every page (`src/lib/pdf-price-strip.ts`)**
- On each page, draw a horizontal line near the bottom and add:
  - Left: "Timeless Windows Ltd 2 New Kings Rd London SW6 4SA"
  - Right: "X of Y" page numbering
- Use pdf-lib's `drawText` and `drawLine`

**4. Store company details as constants**
- Add company name/address as constants at the top of the file so they're easy to update later
- Consider reading from Settings/pricing context if available, but for now hardcode matching your actual business details

### Technical approach
All changes stay in `src/lib/pdf-price-strip.ts`. The existing flow in `PdfImportDialog.tsx` already calls `stripPricesFromPdf()` and stores the result as `supplierPdfClean` — no changes needed there.

### Files modified
- `src/lib/pdf-price-strip.ts` — enhanced redaction + logo + footer

