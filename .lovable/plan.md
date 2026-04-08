

## Plan: Enhance Excel Reader to Extract Additional Quote Fields

### Problem
The `ExtractedLineItem` interface only captures basic fields (ref, type, qty, width, height, price, currency, supplier). When Excel files contain additional columns like uplift, installation costs, architrave type, etc., this data is ignored. The import then hardcodes defaults (uplift=0, installationType='Internal', etc.).

### Changes

**1. Extend `ExtractedLineItem` in `src/lib/pdf-reader.ts`**
Add optional fields to the interface:
- `uplift?: number`
- `installationType?: 'Internal' | 'External'`
- `installationOverride?: number`
- `architraveType?: string`
- `trimsType?: string`
- `mdfRevealType?: string`
- `customExtra?: number`

**2. Update `src/lib/excel-reader.ts` — detect additional columns**

Add new header patterns in `detectColumns()`:
- **uplift**: match `uplift`, `markup`, `margin`
- **installation**: match `installation`, `install`, `labour`, `labor`, `fitting`
- **installationType**: match `installation type`, `install type`, `int/ext`, `location`
- **architrave**: match `architrave`, `arch`
- **trims**: match `trims`, `trim`
- **mdf**: match `mdf`, `reveal`
- **extra/custom**: match `extra`, `custom`, `additional`

In the data row parsing, extract these values and include them in the `ExtractedLineItem`:
- Parse uplift as a number (percentage or absolute)
- Parse installation cost as a number
- Detect installation type from text ('Internal'/'External')
- Detect architrave/trims/mdf types from text

**3. Update `src/components/PdfImportDialog.tsx` — use extracted fields on import**

In `handleImport()`, use the extracted optional fields instead of hardcoded defaults:
```
uplift: ext.uplift ?? 0,
installationType: ext.installationType ?? 'Internal',
installationOverride: ext.installationOverride,
architraveType: ext.architraveType ?? 'none',
...
```

### Files modified
- `src/lib/pdf-reader.ts` — extend `ExtractedLineItem` interface
- `src/lib/excel-reader.ts` — detect and extract additional columns
- `src/components/PdfImportDialog.tsx` — pass extracted fields through to `QuoteLineItem`

