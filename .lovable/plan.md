

## Plan: Add Description and Cost Fields for Custom Extra

### What it does
When a user enters a custom extra selling amount (> 0), two additional fields appear inline: **Description** and **Cost (£)**. The description replaces the generic "Custom (£X)" label in the Installation Report, and the cost field tracks the actual cost separately from the selling price.

### Changes

**`src/lib/types.ts`**
- Add `customExtraDesc?: string` and `customExtraCost?: number` to `QuoteLineItem`

**`src/lib/context.tsx`**
- Add defaults `customExtraDesc: ''`, `customExtraCost: 0` to new line item template

**`src/pages/QuoteBuilder.tsx`** (line ~865-868)
- When `customExtra > 0`, render two additional fields inline next to the Extra (£) input:
  - "Description" text input → `customExtraDesc`
  - "Cost (£)" number input → `customExtraCost`

**`src/lib/pricing.ts`** (line ~185)
- Cost breakdown: change `b.extras += item.customExtra` to `b.extras += item.customExtraCost ?? item.customExtra` so cost uses the dedicated cost field when provided

**`src/lib/pdf-export.ts`** (line ~296)
- Installation Report: replace `Custom (${formatCurrency(item.customExtra)})` with `item.customExtraDesc || 'Custom Extra'`

### Files modified
- `src/lib/types.ts`
- `src/lib/context.tsx`
- `src/pages/QuoteBuilder.tsx`
- `src/lib/pricing.ts`
- `src/lib/pdf-export.ts`

