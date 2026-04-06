

## Plan: Add Per-Item Overhead Cost with Configurable Rate

### What the user wants

Currently, overhead is calculated only at the quote level: `overheadDays × overheadPerDay`. The user wants an additional **per-item overhead cost** calculated as a fraction of the overhead rate (e.g., `0.1 × overheadPerDay`), and a configurable field to change that fraction.

### Changes

#### 1. `src/lib/types.ts` — Add new field to `PricingData`
- Add `overheadPerItemRate: number` (default `0.1`) — the fraction of `overheadPerDay` applied per item

#### 2. `src/lib/context.tsx` — Set default
- Add `overheadPerItemRate: 0.1` to `DEFAULT_PRICING`

#### 3. `src/lib/pricing.ts` — Apply per-item overhead in cost breakdown
- In `getItemCostBreakdown`: add `b.overhead = pricing.overheadPerItemRate * pricing.overheadPerDay` (when not supply-only)
- Add `overhead` to the `PriceBreakdown` interface
- Include `overhead` in `b.unitTotal` sum
- In `calculateQuoteSummary`: accumulate per-item overhead into the summary, keep the existing `overheadDays` calculation as a separate total-level overhead

#### 4. `src/components/PricingEditor.tsx` — Add editable field
- Add an `EditRow` for "Overhead per item rate" (`overheadPerItemRate`) in the "Other Costs" section, with unit "×"

#### 5. `src/pages/SettingsPage.tsx` — Add field in General/Cost tab
- Add an `EditRow` for "Overhead per item rate" next to the existing "Overhead / day" field

### How it works

```text
Per-item overhead cost = overheadPerItemRate × overheadPerDay
Example: 0.1 × £2000 = £200 per item

Total overhead = (per-item overhead × total items) + (overheadDays × overheadPerDay)
```

### Files to update

| File | Change |
|---|---|
| `src/lib/types.ts` | Add `overheadPerItemRate` to `PricingData` |
| `src/lib/context.tsx` | Add default `0.1` |
| `src/lib/pricing.ts` | Add `overhead` to `PriceBreakdown`, calculate per-item overhead in cost breakdown |
| `src/components/PricingEditor.tsx` | Add editable field for the rate |
| `src/pages/SettingsPage.tsx` | Add editable field for the rate |

