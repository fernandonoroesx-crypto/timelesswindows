

## Plan: Fix Excel Download + Use Logo from Storage Bucket

### Problem
1. **Excel download crashes** — `currCols` is used on line 71 before its declaration on line 81, causing "Cannot access 'currCols' before initialization"
2. **Logo loaded from static file** — all three export files (`excel-export.ts`, `pdf-export.ts`, `pdf-price-strip.ts`) fetch the logo from `/images/timeless-logo.png`. The user wants to use a high-quality logo stored in a cloud storage bucket instead.

### Changes

**1. Create a `logo` storage bucket (migration)**
- Create a public bucket called `logo`
- Add RLS policy allowing public read access
- Upload the existing high-quality logo PNG to this bucket (from `public/images/timeless-logo.png`)

**2. Create shared logo helper (`src/lib/logo.ts`)**
- Single function `getLogoUrl()` that returns the public URL for the logo from the `logo` bucket
- Helper functions `loadLogoAsArrayBuffer()` and `loadLogoAsBase64()` that fetch from the bucket URL

**3. Fix `src/lib/excel-export.ts`**
- Move `const currCols = [7, 8, 9, 10, 11, 12];` above the header row loop (before line 64) — this fixes the crash
- Update `loadLogoForExcel()` to use the bucket URL instead of `/images/timeless-logo.png`

**4. Update `src/lib/pdf-export.ts`**
- Update `loadLogoBase64()` to fetch from the bucket URL

**5. Update `src/lib/pdf-price-strip.ts`**
- Update `LOGO_PATH` to use the bucket URL

### Files modified
- New migration SQL — create `logo` bucket with public read policy
- `src/lib/logo.ts` — new shared logo URL helper
- `src/lib/excel-export.ts` — fix `currCols` ordering + use bucket logo
- `src/lib/pdf-export.ts` — use bucket logo
- `src/lib/pdf-price-strip.ts` — use bucket logo

