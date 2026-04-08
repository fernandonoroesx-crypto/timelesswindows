

## Plan: Update Edge Function with Full Skill Redaction Logic

### Overview
Update the `clean-pdf` edge function to match the uploaded skill's redaction logic exactly, adding missing redaction targets and improving euro amount detection. Keep branding (logo + footer) client-side with pdf-lib as it already works.

### Changes to `supabase/functions/clean-pdf/index.ts`

**1. Improve euro amount detection**
- Current: searches for `",-"` and extends left by 60px — imprecise, may catch non-price text
- New: use `page.toStructuredText("text").asText()` word extraction with regex `/^\d{3,5},-$/` to match exact euro amounts, using tight bounds (`y1 - 0.3`)

**2. Add page-1-only redactions**
- Redact `"All openings shown as english openings"` (case variations)
- Redact `"Timeless Windows Ltd"` header only when `y0 < 100` (avoid touching footer)

**3. Handle "Order No." repositioning**
- Before redacting page 1, extract the "Order No." text and its position
- Redact the original "Order No." line (between y 85–110)
- After applying redactions, re-insert "Order No." text at the position where "Timeless Windows Ltd" header was (using MuPDF's text insertion if available, otherwise skip this refinement)

**4. Add `page.cleanContents()` after each page**
- Removes residual graphics operators from the content stream after redaction

### Changes to `src/lib/pdf-price-strip.ts`

**No changes needed** — branding (logo + footer) is already applied client-side after receiving the cleaned PDF.

### Files modified
- `supabase/functions/clean-pdf/index.ts` — updated redaction logic

