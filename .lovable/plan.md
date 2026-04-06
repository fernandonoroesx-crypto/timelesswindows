

## Plan: Convert Trims from Flat Rate to Per Linear Meter

Trims currently use a flat rate per type. This change makes Trims use the same LM formulas as Architrave and MDF:
- **Single**: `(Width + 2×Height) / 1000`
- **Bay Side**: `(Width + Height) / 1000`
- **Bay Central**: `Width / 1000`

Final calculation: `LM(type) × rate per meter`

### Files to change

**`src/lib/pricing.ts`** — Update trims calculation in both selling and cost breakdowns from flat rate to `calculateTypeLm(trimsType, w, h) * rate`

**`src/components/PricingEditor.tsx`** — Update Trims section header from "per item" to "per LM"

No changes needed to types, context defaults, or QuoteBuilder — Trims already uses the same `single/baySide/bayCentral` type system and dropdown as Architrave.

