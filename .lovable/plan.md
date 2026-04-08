

## Plan: Replace clean-pdf with Python-Based PDF Processing

### Problem
The current `clean-pdf` Supabase Edge Function uses MuPDF WASM bindings in Deno, which doesn't reliably replicate the PyMuPDF (fitz) behavior from the skill. The user has confirmed the Python/fitz approach works correctly when used directly.

### Constraint
Supabase Edge Functions run Deno — they cannot execute Python. To use PyMuPDF (fitz) as the skill specifies, we need a different architecture.

### Approach: Python Edge Function via Supabase

Create a new edge function called `strip-prices` that receives the PDF, writes it to `/tmp`, runs the Python fitz script inline, and returns the result. **However**, Deno cannot run Python natively.

### Revised Approach: Client-Side Processing

Since we cannot run Python in edge functions, and the MuPDF WASM approach isn't working reliably, the alternative is:

1. **Delete the `clean-pdf` edge function** — stop using the unreliable MuPDF WASM approach
2. **Rewrite `src/lib/pdf-price-strip.ts` to use `pdf-lib` client-side** with precise text extraction via `pdfjs-dist`, matching the skill's exact redaction targets:
   - Use `pdfjs-dist` to extract all text items with their exact coordinates
   - Identify price text by matching `/^\d{3,5},-$/`, "Price,", "EUR", "Total," (x > 400), and summary phrases
   - Use `pdf-lib` to manipulate the content stream — drawing white rectangles is unavoidable client-side, but we can minimize artifacts by using exact bounding boxes

### Better Alternative: Fix the Edge Function to Match the Skill Exactly

The MuPDF WASM npm package wraps the **same C library** as PyMuPDF (fitz). The issue is likely in how we're calling the API, not the library itself. We should:

1. **Rename/rewrite the edge function** to precisely mirror the Python skill's logic
2. Map each fitz API call to its mupdf.js equivalent:
   - `page.search_for("Price,")` → `page.search("Price,")`
   - `page.get_text("words")` → `page.toStructuredText()` parsed for words
   - `page.add_redact_annot(rect)` → `page.createAnnotation("Redact"); annot.setRect(rect)`
   - `page.apply_redactions(images=NONE, graphics=LINE_ART_NONE)` → `page.applyRedactions(false, 0)`
   - `page.clean_contents()` → `page.cleanContents()`

### Recommendation

Before choosing an approach, I need to understand: **what specifically is failing** with the current edge function? Is it:
- The function errors out (500)?
- The function returns a PDF but prices aren't removed?
- The function returns a PDF but table lines are damaged?
- Something else?

This would help determine whether to fix the edge function or switch to a completely different approach. Could you describe what happens when you click "Remove Prices" — does it fail with an error, or does the output look wrong?

