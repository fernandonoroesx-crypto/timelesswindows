

## Plan: Add MDF Width Dimension (Narrow/Wide) as Second Dropdown

MDF Reveal currently has one dropdown (Single/Bay Side/Bay Central) that controls the linear meter formula. You want a second dropdown for width (Narrow/Wide) that determines which rate is applied. The final MDF cost = `LM(type) × rate(width)`.

### Changes

**`src/lib/types.ts`**
- Add `MdfWidthType = 'narrow' | 'wide'`
- Add `mdfWidthType: MdfWidthType` to `QuoteLineItem` (defaults to `'narrow'`)
- Change `MdfPricing` to `{ narrow: { single: number; baySide: number; bayCentral: number }; wide: { single: number; baySide: number; bayCentral: number } }` — 6 rates total (narrow/wide × single/baySide/bayCentral)

**`src/lib/context.tsx`**
- Update `DEFAULT_PRICING.mdfSelling` and `mdfCost` to nested structure with narrow/wide sub-objects
- Update `createNewLineItem` to include `mdfWidthType: 'narrow'`

**`src/lib/pricing.ts`**
- MDF calculation becomes: `calculateTypeLm(mdfRevealType, w, h) × pricing.mdf[mdfWidthType][mdfRevealType]`
- Update both selling and cost breakdowns

**`src/pages/QuoteBuilder.tsx`**
- Add a second dropdown next to MDF Reveal for "MDF Width" with Narrow/Wide options
- Only show width dropdown when mdfRevealType is not 'none'

**`src/components/PricingEditor.tsx`**
- Update MDF settings section to show 6 rate inputs grouped by Narrow and Wide, each with Single/Bay Side/Bay Central sub-rates

### No migration needed
All MDF data is stored in the JSONB `line_items` column. Existing items without `mdfWidthType` will default to `'narrow'` via fallback logic.

