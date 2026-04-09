

## Plan: Default Currency to EUR and Supplier to "Staliu Gaminiai"

### What it does
New line items will always start with **EUR** as the currency and **"Staliu Gaminiai"** as the pre-selected supplier, instead of GBP and no supplier.

### Changes

**`src/lib/context.tsx`** (line 121-122)
- Change `manufactureCurrency: 'GBP'` → `'EUR'`
- Change `supplier: ''` → `'Staliu Gaminiai'`

**`src/pages/QuoteBuilder.tsx`** (line 798)
- Change the "no supplier" fallback from `'GBP'` to `'EUR'`, so clearing the supplier still keeps EUR as default

### Files modified
- `src/lib/context.tsx`
- `src/pages/QuoteBuilder.tsx`

