

## Plan: Server-Side PDF Price Stripping with PyMuPDF

### Problem
The current client-side approach (pdfjs-dist + pdf-lib) draws white filled rectangles to "redact" prices. These are visible as artifacts in any PDF editor. The user wants true redaction with zero visual artifacts.

### Architecture

```text
Browser                          Edge Function (clean-pdf)
  |                                    |
  |-- POST pdf (base64) ------------->|
  |                                    |-- PyMuPDF via mupdf WASM
  |                                    |-- add_redact_annot (no fill)
  |                                    |-- apply_redactions (preserve line art)
  |<-- cleaned pdf (base64) ----------|
```

### Technical Approach

Supabase Edge Functions run Deno, not Python. However, the `mupdf` npm package provides official MuPDF WASM bindings for JavaScript with redaction support. This gives us the same core capability as PyMuPDF (fitz) — proper PDF redaction annotations that remove text from the content stream without painting white rectangles.

The redaction logic will mirror the user's Python code exactly:
1. Search for "Price," headers and extend rect to cover "EUR" 
2. Search for "Total," headers only at x > 400 (avoid "Total sq.m.:")
3. Match euro amounts with `/^\d{3,5},-$/` pattern, tight y-bounds (y1 - 0.3)
4. Remove summary phrases ("Total excl. VAT:", "TOTAL INVOICE:", disclaimer)
5. Apply redactions preserving images and line art

### Changes

**1. Create `supabase/functions/clean-pdf/index.ts`**
- Receive PDF as base64 in POST body
- Use `mupdf` WASM to open the document
- Apply redaction annotations matching the user's exact patterns
- Apply redactions with image/line-art preservation
- Return cleaned PDF as base64
- CORS headers for browser access

**2. Rewrite `src/lib/pdf-price-strip.ts`**
- Replace client-side pdfjs-dist + pdf-lib processing with a call to the `clean-pdf` edge function
- Send PDF arrayBuffer as base64, receive cleaned PDF base64 back
- Keep the `fileToBase64` utility
- Remove pdfjs-dist and pdf-lib imports (no longer needed for this module)
- Add branding (logo + footer) client-side via pdf-lib after receiving the cleaned PDF from the server, OR do it in the edge function

**3. Update `src/components/PdfImportDialog.tsx`** (minor)
- No structural changes needed — `stripPricesFromPdf` API stays the same (takes ArrayBuffer, returns base64 string)
- Add loading indicator during server-side processing (may take a few seconds)

**4. UI unchanged**
- "Supplier PDF (No Prices)" menu item and viewer dialog already exist in QuoteBuilder
- The flow remains: upload PDF → auto-generate clean version → view/download from Reports menu

### Key Technical Details

- **No fill argument**: MuPDF redaction annotations without explicit fill remove text from the content stream entirely — no white rectangle artifact
- **Tight y-bounds**: Price amount redaction uses `y1 - 0.3` to avoid bleeding over table separator lines
- **Line art preservation**: `applyRedactions()` with appropriate flags preserves all vector paths (table borders, diagrams)
- **Branding**: Logo placement (top-right page 1) and footer (company name + address + page numbers) added after redaction

### Files created/modified
- `supabase/functions/clean-pdf/index.ts` — new edge function
- `src/lib/pdf-price-strip.ts` — rewritten to call edge function
- `src/components/PdfImportDialog.tsx` — minor loading state update

