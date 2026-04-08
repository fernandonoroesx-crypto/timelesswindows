

## Plan: Add Cost Fields for Extras and Waste Disposal

### What changes
Currently, Extras and Waste Disposal each have a single price value shared by both selling and cost calculations. This splits them into separate selling and cost fields, matching the pattern used by Installation, Making Good, Architrave, Trims, and MDF.

### Data model changes (`src/lib/types.ts`)

- Rename `extras` → `extrasSelling` (Record of selling prices)
- Add `extrasCost: Record<string, number>` (Record of cost prices)
- Rename `wasteDisposal` → `wasteDisposalSelling: number`
- Add `wasteDisposalCost: number`

### Default pricing (`src/lib/context.tsx`)

- Split the current `extras` values into `extrasSelling` and `extrasCost` (initially same values)
- Split `wasteDisposal: 35` into `wasteDisposalSelling: 35` and `wasteDisposalCost: 35`

### Normalization (`src/lib/pricing-normalize.ts`)

- Add backward compatibility: if old `extras` field exists (no `extrasSelling`), copy it to both `extrasSelling` and `extrasCost`
- Same for `wasteDisposal` → `wasteDisposalSelling` + `wasteDisposalCost`

### Pricing engine (`src/lib/pricing.ts`)

- Selling breakdown: use `pricing.extrasSelling` and `pricing.wasteDisposalSelling`
- Cost breakdown: use `pricing.extrasCost` and `pricing.wasteDisposalCost`

### Settings UI (`src/components/PricingEditor.tsx`)

- **Selling Prices tab**: Show Extras selling prices and Waste Disposal selling price
- **Cost Prices tab**: Show Extras cost prices and Waste Disposal cost price
- Follow existing pattern of `sellingOnly` flag to control visibility

### Other files touched

- `src/pages/QuoteBuilder.tsx` — update any direct references to `pricing.extras` / `pricing.wasteDisposal` to use the selling variants
- `src/lib/excel-export.ts` — if referencing these fields directly
- `src/lib/pdf-export.ts` — if referencing these fields directly

### Files modified
- `src/lib/types.ts`
- `src/lib/context.tsx`
- `src/lib/pricing-normalize.ts`
- `src/lib/pricing.ts`
- `src/components/PricingEditor.tsx`
- `src/pages/QuoteBuilder.tsx`
- `src/lib/excel-export.ts` (if needed)
- `src/lib/pdf-export.ts` (if needed)

