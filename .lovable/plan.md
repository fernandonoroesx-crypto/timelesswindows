

## Plan: Fix Supplier PDF Feature — Two Issues

### Problem
1. **Bug**: The price-strip function crashes with "Cannot perform Construct on a detached ArrayBuffer" because `pdfjs-dist` and `pdf-lib` both try to use the same `ArrayBuffer`. Once pdfjs reads it, the buffer is detached and pdf-lib fails.
2. **Result**: Since the strip fails silently, `supplierPdfOriginal` is still set but `supplierPdfClean` is not. However, the error also prevents the `onPdfFiles` callback from completing, so neither PDF option appears in the Reports dropdown.

### Fix

**1. Fix the detached ArrayBuffer bug** (`src/lib/pdf-price-strip.ts`)
- Copy the ArrayBuffer at the start of `stripPricesFromPdf` so each library gets its own copy:
  ```typescript
  const copy1 = arrayBuffer.slice(0);
  const copy2 = arrayBuffer.slice(0);
  // use copy1 for pdfjs, copy2 for pdf-lib
  ```

**2. Make original PDF persist even if strip fails** (`src/components/PdfImportDialog.tsx`)
- Currently both original and clean are set inside the same try block. Move the original storage outside so it always succeeds, and only the clean part is in the try/catch. This way "Supplier PDF (Original)" always appears after import, even if stripping fails.

### Files modified
- `src/lib/pdf-price-strip.ts` — slice ArrayBuffer copies to avoid detach error
- `src/components/PdfImportDialog.tsx` — ensure original PDF callback fires even if strip fails

