

## Plan: Create PDF Editor Tab with Skill-Aligned Processing

### What we're building
A new "PDF Editor" page accessible from the sidebar where users can upload a supplier PDF, click "Convert to Specification", and download a clean client-facing PDF with all pricing removed and Timeless Windows branding applied.

### Root cause of current issues
The edge function logs show `twBaselineY: null, orderText: null` — the MuPDF WASM structured text extraction is not finding the header data. The `toStructuredText().asJSON()` parsing doesn't match how MuPDF WASM actually returns structured text. We need to fix the word/text extraction to use `page.search()` consistently (which works — it already finds "Price," and "Total,") instead of relying on fragile JSON parsing.

### Changes

**1. Create `src/pages/PdfEditorPage.tsx`**
- Simple page: drag-and-drop upload area, "Convert to Specification" button, loading spinner
- After processing: inline PDF preview (iframe) + download button
- Download filename: `[original name] - Specifications.pdf`
- Error toast on failure
- Uses `stripPricesFromPdf()` from `pdf-price-strip.ts`

**2. Add route and nav item**
- `src/App.tsx`: add `/pdf-editor` route for admin and manager roles
- `src/components/AppLayout.tsx`: add nav item with `FileEdit` icon labeled "PDF Editor"

**3. Fix `supabase/functions/clean-pdf/index.ts` — align with skill**
The key fixes to match the Python skill exactly:

- **Fix header extraction**: Instead of parsing structured text JSON (which returns null), use `page.search("Timeless Windows Ltd")` and `page.search("Order No.")` to get coordinates — these searches already work (proven by Price/Total searches working)
- **Fix Order No. re-insertion**: After redaction, use MuPDF's `page.insertText()` to place Order No. at the captured Timeless Windows header position — moves all branding server-side
- **Add footer server-side**: Insert footer text and page numbers using `page.insertText()` with Times Roman 9pt at exact coordinates from skill (y=838.9, centered, page numbers at x=556.77)
- **Add logo server-side**: Fetch logo from storage bucket, insert at exact rect (425.978, 9.939, 583.103, 50.162) on page 0

**4. Simplify `src/lib/pdf-price-strip.ts`**
- Remove all pdf-lib branding logic (logo, footer, Order No. re-insertion)
- Becomes a thin wrapper: send PDF to edge function, receive complete branded PDF back
- The edge function now returns the fully finished PDF

### Technical details

MuPDF WASM to PyMuPDF mapping for the fixes:
- `page.search("text")` returns quads — same as `page.search_for("text")` in fitz (already working)
- `page.insertText(point, text, fontname, fontsize)` — equivalent to `page.insert_text()` in fitz
- `page.insertImage(rect, imageBuffer)` — equivalent to `page.insert_image()` in fitz
- Header data extraction will use `page.search()` results instead of broken JSON parsing

### Files created/modified
- `src/pages/PdfEditorPage.tsx` — new page (upload + process + preview + download)
- `src/App.tsx` — add route
- `src/components/AppLayout.tsx` — add nav item
- `supabase/functions/clean-pdf/index.ts` — fix extraction, add server-side branding
- `src/lib/pdf-price-strip.ts` — simplify to thin wrapper

