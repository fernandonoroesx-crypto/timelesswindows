

## Plan: Replace Per-Item Overhead with Project-Level Estimated Days

### What changes

Remove `overheadPerItemRate` entirely. Overhead is calculated only at the project level as `overheadDays × overheadPerDay`. Add a visible "Estimated days" input field in the quote header so the user can set how long the project will take.

### Changes

#### 1. `src/lib/types.ts` — Remove `overheadPerItemRate` from `PricingData`

#### 2. `src/lib/context.tsx` — Remove `overheadPerItemRate` from `DEFAULT_PRICING`

#### 3. `src/lib/pricing.ts` — Remove per-item overhead from cost breakdown
- In `getItemCostBreakdown`: remove `b.overhead` calculation (set to 0 or remove)
- Remove `overhead` from `unitTotal` sum in cost breakdown
- Keep the project-level overhead in `calculateQuoteSummary` (`settings.overheadDays × pricing.overheadPerDay`)

#### 4. `src/pages/QuoteBuilder.tsx` — Add "Estimated days" field
- Add an input field for `overheadDays` in the quote header settings area (next to toggles or in the project details grid)
- Remove "Overhead (per item)" row from the breakdown table
- Keep "Overhead (days)" row showing the project-level overhead cost

#### 5. `src/components/PricingEditor.tsx` — Remove the `overheadPerItemRate` EditRow

#### 6. `src/pages/SettingsPage.tsx` — Remove the `overheadPerItemRate` EditRow

### How it works

```text
Overhead = overheadDays × overheadPerDay
Example: 3 days × £2000/day = £6000 total project overhead

User sets "Estimated days" per quote in the quote header.
overheadPerDay rate comes from Settings (or quote-level pricing override).
```

### Files to update

| File | Change |
|---|---|
| `src/lib/types.ts` | Remove `overheadPerItemRate` |
| `src/lib/context.tsx` | Remove from defaults |
| `src/lib/pricing.ts` | Remove per-item overhead from cost breakdown |
| `src/pages/QuoteBuilder.tsx` | Add "Estimated days" input field, remove per-item overhead row |
| `src/components/PricingEditor.tsx` | Remove `overheadPerItemRate` field |
| `src/pages/SettingsPage.tsx` | Remove `overheadPerItemRate` field |

