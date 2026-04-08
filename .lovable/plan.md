

## Plan: Add Logo to Excel & PDF Exports, Change Excel Colour Scheme

### What changes
1. Copy the uploaded high-quality PNG logo into the project
2. Add the logo to the top-right of the Excel quote report
3. Update the PDF export to use the new PNG logo instead of the existing JPG
4. Change the Excel colour scheme from dark blue to grey/black

### Changes

**1. Copy logo (`public/images/timeless-logo.png`)**
- Replace the existing file with the uploaded high-quality version using `lov-copy user-uploads://logo.png public/images/timeless-logo.png`

**2. Excel export (`src/lib/excel-export.ts`)**
- Change colour constants: `DARK_BLUE` → dark charcoal (`FF2D2D2D`), update title font colour to black
- Add a `loadLogoForExcel()` function that fetches `/images/timeless-logo.png` and converts to an ArrayBuffer
- Insert the logo image into the worksheet at the top-right area (around columns I-L, row 1) using `ws.addImage()` and `ws.addImage()` placement
- Adjust header row height to accommodate the logo
- Update summary header and grand total row colours to use the new charcoal/grey scheme

**3. PDF export (`src/lib/pdf-export.ts`)**
- Update `loadLogoBase64()` to fetch `/images/timeless-logo.png` instead of the JPG
- Change `addImage` format from `'JPEG'` to `'PNG'` for higher quality rendering

### Files modified
- `public/images/timeless-logo.png` — replaced with uploaded high-quality logo
- `src/lib/excel-export.ts` — add logo, change colours to grey/black
- `src/lib/pdf-export.ts` — use PNG logo

