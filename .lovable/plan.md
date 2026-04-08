

## Plan: Fix Glass Spec Detection for Space-Joined PDF Text

### Problem
The `detectGlassSpec` function uses `(?:\n|$)` as a line boundary, but pdfjs joins all text on a page with spaces (no newlines). The lazy `.+?` match captures almost nothing, missing the glass spec like `(4-16Ar-4LowE)` which should yield 24mm.

### Fix

**`src/lib/pdf-reader.ts`** — update `detectGlassSpec`

Instead of trying to extract the full "4. Glass:" line and then searching for the spec within it, search the preceding text directly for the parenthesized glass spec pattern near "4. Glass":

1. Change the approach: look for `4.\s*Glass` followed by any text, then find a parenthesized spec pattern `(\d+-\d+\w*-\d+\w*)` nearby
2. Use a single regex that matches `4\.\s*Glass[^()]*\((\d+\w*(?:-\d+\w*)+)\)` to directly capture the spec from within parentheses after the Glass field label
3. This handles both space-joined and newline-separated text

The `calcGlassThickness` function is correct and unchanged — `4-16Ar-4LowE` → 4+16+4 = 24mm.

### Files modified
- `src/lib/pdf-reader.ts` — rewrite `detectGlassSpec` regex to directly match parenthesized spec after "Glass" label

