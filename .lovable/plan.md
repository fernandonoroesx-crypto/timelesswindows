

## Plan: Fix Supplier PDF Price/Comment Stripping

### Problem
Comparing the Before (supplier) and After (cleaned) PDFs side-by-side reveals the current code fails to remove several categories of content. The redaction approach (white rectangles over detected text) is correct but the detection logic is incomplete.

### What needs to be removed (from the reference PDFs)

From the supplier PDF, these elements should be redacted:
- **Price column headers**: "Price, EUR" and "Total, EUR"
- **Price values in table rows**: e.g. `1370,-`, `1352,-`, `1028,-`, `1160,-`
- **Summary price lines**: "Total excl. VAT: 4910,-", "TOTAL INVOICE: 4910,-"
- **Price disclaimer**: "All prices excl. VAT and transport cost."
- **"Pricing" section headers** on pages 2-3
- **"Order No." prefix** from the project reference line (keep the ref, remove the prefix)
- **"All openings shown as english openings"** header line

These should be **kept**: Quantity, Total sq.m., Size, Area, product specs, drawings.

### Root causes in current code

1. **Price column detection is fragment-only** — `isPriceHeader()` checks individual text fragments but doesn't establish column X-ranges to redact all values below the header
2. **Missing redaction patterns** — no detection for "Pricing", "Order No.", "All openings", "Total excl. VAT", "TOTAL INVOICE", "All prices excl."
3. **`isCommentLine()` too narrow** — only matches "comment:", "note:" etc. Needs to also catch the supplier-specific text like "All openings shown as english openings"
4. **Logo may not load** — if the PNG wasn't uploaded to the storage bucket, the logo silently fails

### Changes in `src/lib/pdf-price-strip.ts`

**1. Add column-based price redaction**
- When a price header fragment is found (e.g. "Price, EUR" at x=350), record its X-range
- On all subsequent data lines on the same page, redact any text fragment whose X position falls within a detected price column range
- This ensures price values are removed even if their text format doesn't match a regex

**2. Expand `isPriceHeader()` to catch more variations**
- Add: "pricing", "total, eur" (already there but may be fragmented), "total excl", "total invoice"

**3. Add new redaction categories**
- `isSummaryPriceLine()`: matches lines containing "Total excl. VAT", "TOTAL INVOICE", "All prices excl. VAT"
- `isRedactableLine()`: matches "All openings shown as english openings", "Pricing" as standalone section header
- `isOrderNoPrefix()`: detects "Order No." text fragment to redact just that prefix (not the whole line)

**4. Improve price value regex**
- Ensure the `\d+,-` format (European no-cents notation like `1370,-`, `4910,-`) is reliably caught
- Add pattern: `/\d{3,6}\s*,-/g` specifically for this format

**5. Add footer address from reference**
- Keep the existing footer: "Timeless Windows Ltd  |  2 New Kings Rd London SW6 4SA" (already matches the reference After PDF)

**6. Add error logging for logo loading**
- Log the URL being fetched so failures can be debugged
- Ensure the logo bucket has the file uploaded

### Files modified
- `src/lib/pdf-price-strip.ts` — improved detection + column-based redaction + new patterns

