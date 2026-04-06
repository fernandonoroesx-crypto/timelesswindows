

## Plan: Update Linear Meter Formulas + Convert MDF to Per-LM with Single/Side/Central Types

### What's changing

**1. Different LM formulas per type** (applies to both Architrave and MDF):
- **Single**: `(2 × Height + Width) / 1000` — already correct
- **Bay Side**: `(Height + Width) / 1000` — new formula  
- **Bay Central**: `Width / 1000` — new formula

**2. MDF changes from flat-rate to per-linear-meter**, using the same three types (single/baySide/bayCentral) instead of narrow/wide.

### Files to change

**`src/lib/pricing.ts`**
- Replace the single `calculateArchitraveLm()` function with a new function that takes the type and returns the correct LM:
  - `single` → `(width + 2*height) / 1000`
  - `baySide` → `(width + height) / 1000`
  - `bayCentral` → `width / 1000`
- Update architrave calculation in both selling and cost breakdowns to use the type-specific LM
- Change MDF calculation from flat rate to: `LM(type) × rate per meter` using the same LM function

**`src/lib/types.ts`**
- Change `MdfRevealType` from `'none' | 'narrow' | 'wide'` to `'none' | 'single' | 'baySide' | 'bayCentral'`
- Update `MdfPricing` interface to match: `{ single: number; baySide: number; bayCentral: number }`

**`src/lib/context.tsx`**
- Update `DEFAULT_PRICING.mdfSelling` and `mdfCost` keys from `narrow/wide` to `single/baySide/bayCentral`

**`src/components/PricingEditor.tsx`**
- Remove the separate `MDF_LABELS` map; reuse `ARCH_TRIM_LABELS` for MDF sections
- Update MDF section header to show "per LM" instead of flat rate

**`src/pages/QuoteBuilder.tsx`** (or wherever line item MDF dropdown is rendered)
- Update dropdown options from narrow/wide to Single/Bay Side/Bay Central

### No database migration needed
MDF type is stored inside the `line_items` JSONB column on `projects`. Existing quotes with `narrow`/`wide` values will gracefully default to 0 cost (no match in pricing lookup), which is safe.

