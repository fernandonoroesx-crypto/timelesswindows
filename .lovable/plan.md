
Fix the cleaned supplier PDF so prices are actually removed reliably.

What I found
- The current redaction logic in `src/lib/pdf-price-strip.ts` is too simple: it only removes text items when the whole PDF text chunk already looks like a full price. In many PDFs, prices are split into separate chunks like `587`, `,`, `-`, so they are missed.
- The rectangle placement is fragile. It uses raw text transform values with minimal padding, so even matched prices may be only partially covered.
- There is also a persistence gap: `src/lib/database.ts` does not save/load `supplierPdfOriginal`, `supplierPdfClean`, or `supplierPdfName`, so these files can disappear after saving/reloading a quote.

Implementation plan

1. Improve price detection in `src/lib/pdf-price-strip.ts`
- Group nearby text items on each page into visual lines/segments before matching.
- Detect more supplier price formats, including split tokens like:
  - `587,-`
  - `1 223,-`
  - `€ 587`
  - `587 €`
  - decimal currency values
- Ignore likely dimensions/measurements so width/height values are not blanked out.

2. Make redaction boxes more robust
- Build each redaction area from the combined bounds of all matched text fragments, not a single item.
- Add safer horizontal/vertical padding so the full price is covered.
- Use page size awareness when converting coordinates so overlays land in the correct place.

3. Keep original and cleaned PDFs stored with the quote
- Update `src/lib/database.ts` so quote save/load includes:
  - `supplier_pdf_original`
  - `supplier_pdf_clean`
  - `supplier_pdf_name`
- If the backend table does not yet have these columns, add a migration to the `quotes` table.
- This ensures the Reports dropdown still has both PDF options after saving and reopening.

4. Improve the import flow in `src/components/PdfImportDialog.tsx`
- Keep storing the original PDF even if cleaned PDF generation fails.
- Show a user-facing warning toast if the cleaned version could not be generated, instead of failing silently.
- Keep the current callback flow into `QuoteBuilder`.

5. Add regression coverage
- Add focused tests for the price-matching helper with sample text fragments representing supplier layouts.
- Verify that common price patterns are matched while dimensions are not.

Technical details
- Files to update:
  - `src/lib/pdf-price-strip.ts`
  - `src/components/PdfImportDialog.tsx`
  - `src/lib/database.ts`
  - `src/lib/types.ts` only if mapping needs adjustment
  - `supabase/migrations/...` only if quote table lacks supplier PDF columns
- Likely root cause is not just one bug:
  ```text
  current flow
  PDF text chunks -> regex on single chunk -> often misses split prices
                                       -> weak rectangle bounds
                                       -> saved only in local state, not persisted
  ```
- Safer approach:
  ```text
  PDF text chunks
    -> merge nearby fragments into line groups
    -> identify price spans inside each group
    -> union fragment bounds for each matched span
    -> draw padded white rectangles
    -> save cleaned/original PDF with quote
  ```

Validation after implementation
- Import a supplier PDF with visible prices.
- Open Reports dropdown and verify both:
  - Supplier PDF (Original)
  - Supplier PDF (No Prices)
- Download the cleaned PDF and confirm price values are removed while dimensions and product text remain.
- Save the quote, reopen it, and confirm both PDF options still exist.

<lov-actions>
<lov-suggestion message="Test the supplier PDF flow end-to-end: import a supplier PDF, download both original and no-prices versions, and confirm the cleaned PDF removes prices correctly even after saving and reopening the quote.">Verify that it works</lov-suggestion>
<lov-suggestion message="Implement the improved PDF price-removal logic by grouping split text fragments, expanding redaction boxes, and persisting both original and cleaned supplier PDFs with the quote.">Fix PDF Price Removal</lov-suggestion>
<lov-suggestion message="Add a preview modal so I can view the original and cleaned supplier PDFs inside the app before downloading them.">Add PDF Preview</lov-suggestion>
</lov-actions>
