

## Plan: Change Making Good LM Formula to Perimeter

### What changes
Making Good currently uses the "single" formula `(Width + 2×Height) / 1000`. Change it to use the perimeter formula `(2×Width + 2×Height) / 1000` — which is the existing `calculateLm()` function.

### Changes in `src/lib/pricing.ts`

Two lines need updating:

1. **Line 100** (selling breakdown): Change `calculateTypeLm('single', ...)` → `calculateLm(item.widthMm, item.heightMm)`
2. **Line 163** (cost breakdown): Same change

Both the selling and cost Making Good calculations will use `(2W + 2H) / 1000` instead of `(W + 2H) / 1000`.

### Files modified
- `src/lib/pricing.ts` — 2 lines changed

