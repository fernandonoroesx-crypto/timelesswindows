

## Plan: Verify and Align Cost Calculations with LM

After reviewing `src/lib/pricing.ts`, the cost breakdown functions for **Architrave**, **Trims**, and **MDF** already use the `calculateTypeLm` formula — they were updated alongside selling. No code changes are needed for the calculation engine.

However, the **PricingEditor** labels for cost sections should be verified to say "per LM" consistently.

### Files to check/update

**`src/components/PricingEditor.tsx`**
- Confirm Architrave Cost header says "(per LM)"
- Confirm Trims Cost header says "(per LM)"
- Confirm MDF Cost header says "(per LM)"
- Update any that still show flat-rate labeling

### Current state (already correct in pricing.ts)

```typescript
// Architrave cost — already uses LM
const archLm = calculateTypeLm(item.architraveType, item.widthMm, item.heightMm);
b.architrave = archLm * (pricing.architraveCost[item.architraveType] || 0);

// Trims cost — already uses LM
const trimLm = calculateTypeLm(item.trimsType, item.widthMm, item.heightMm);
b.trims = trimLm * (pricing.trimsCost[item.trimsType] || 0);

// MDF cost — already uses LM with width dimension
const mdfLm = calculateTypeLm(item.mdfRevealType, item.widthMm, item.heightMm);
const mdfRates = pricing.mdfCost[widthType] || pricing.mdfCost.narrow;
b.mdfReveal = mdfLm * (mdfRates[item.mdfRevealType] || 0);
```

This is a label-only fix in PricingEditor to ensure cost section headers match the selling headers.

