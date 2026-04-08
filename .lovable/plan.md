

## Plan: Fix Price Detection + Remove Comments from Cleaned PDF

### Changes in `src/lib/pdf-price-strip.ts`

**1. Fix price detection on lines containing dimensions (line 94)**
- Remove the early `if (isDimension(text)) return [];` bail-out that skips entire lines containing dimension text like `1340x1550mm`
- Add per-match filtering: skip a regex match only if it overlaps with a dimension substring in the line, preserving prices like `1370,-` on the same line

**2. Detect and redact "comment" text**
- Add a `isCommentLine()` helper that matches common supplier comment patterns (e.g. lines starting with "Comment:", "Note:", "Remark:", or lines in a comments section)
- Also detect and redact any freeform comment/note text blocks from the supplier PDF by scanning for known comment indicators
- White-out entire comment lines/sections the same way prices are redacted

**3. Improve total line detection**
- Ensure lines like `Total excl. VAT: 4910,-` and `TOTAL INVOICE: 4910,-` have their price portions redacted

### Files modified
- `src/lib/pdf-price-strip.ts`

