

## Plan: Rewrite PDF Price Stripping and Add In-App Viewer

### Problem
The current white-rectangle redaction approach is unreliable — it removes wrong text and misses prices. Comparing the before/after reference PDFs shows precisely what must change:

**BEFORE table row:** `1340x1550mm | 2.08m² | Price,EUR 1370,- | Quantity 1 | Total,EUR 1370,-`
**AFTER table row:** `1340x1550mm | 2.08m² | Quantity 1`

**Page 1 header changes:**
- Remove "All openings shown as english openings"
- Remove "Timeless Windows Ltd" (supplier name at top)
- Remove "Order No." prefix (keep just "AXI110 - 3C Oxford Garden")
- Add Timeless Windows logo (top right)
- Replace with "Axis Europe" and reference

**Summary block (last page):**
- KEEP: "Quantity: 4" and "Total sq.m.: 9.02"
- REMOVE: "Total excl. VAT: 4910,-", "TOTAL INVOICE: 4910,-", "All prices excl. VAT and transport cost."

**Also:** Show cleaned PDF in an in-app viewer dialog (like the original PDF viewer) instead of triggering a download. Add a download button inside the viewer.

### Changes

**1. Rewrite `src/lib/pdf-price-strip.ts`**

The core approach stays the same (pdf.js to detect regions, pdf-lib to draw white rectangles), but the detection logic needs a complete overhaul:

- **Price column detection**: Find "Price, EUR" and "Total, EUR" header fragments by X position. Track their column X-ranges. Redact the headers AND all fragments in those columns on subsequent data rows.
- **Price value regex**: Only target `\d{3,5},-` pattern (the supplier format). Do NOT match dimension patterns like `1340x1550mm` or `70x1400mm`.
- **"Pricing" header**: Redact standalone "Pricing" text that appears as a section header on multi-item pages.
- **Summary block**: Redact lines matching `Total excl. VAT`, `TOTAL INVOICE`, and their associated values. Redact "All prices excl. VAT and transport cost." disclaimer.
- **Keep intact**: "Quantity:" and "Total sq.m.:" summary rows, all spec text (1-11), diagrams, dimensions, cert logos, page structure.
- **Page 1 specific**: Redact "All openings shown as english openings", redact "Order No." prefix (keep ref), redact original supplier company name line ("Timeless Windows Ltd" at top — note: this is the supplier's name in the original, replaced by branding).
- **Branding**: Add Timeless Windows logo top-right on page 1. Add footer on every page: "Timeless Windows Ltd 2 New Kings Rd London SW6 4SA" + page numbers.

Key fix: the dimension-range exclusion in `findPriceSpans` must be more aggressive — any match that overlaps with `\d{3,4}x\d{3,4}mm` or `\d+x\d+mm` patterns should be skipped.

**2. Update `src/pages/QuoteBuilder.tsx`**
- Change "Supplier PDF (No Prices)" dropdown item from download action to opening a viewer dialog (same pattern as the original PDF viewer)
- Add state `showCleanPdf` for the dialog
- Add a new Dialog with iframe for the cleaned PDF, with a download button inside

### Files modified
- `src/lib/pdf-price-strip.ts` — rewritten detection logic
- `src/pages/QuoteBuilder.tsx` — cleaned PDF viewer dialog instead of download

