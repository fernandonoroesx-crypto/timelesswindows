import type { PricingData, MdfPricingWidth } from './types';
import { DEFAULT_PRICING } from './context';

/**
 * Normalize a single MDF width entry.
 * If it's a legacy scalar number, expand it into { single, baySide, bayCentral }.
 * If it's an object, merge with the default to fill any missing keys.
 */
function normalizeMdfWidth(val: unknown, fallback: MdfPricingWidth): MdfPricingWidth {
  if (typeof val === 'number') {
    return { single: val, baySide: val, bayCentral: val };
  }
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return { ...fallback, ...(val as Partial<MdfPricingWidth>) };
  }
  return { ...fallback };
}

/**
 * Deep-merge pricing data with DEFAULT_PRICING, repairing any legacy
 * scalar MDF values along the way. Safe to call on any pricing object.
 */
export function normalizePricingData(raw?: Partial<PricingData> | null): PricingData {
  if (!raw) return JSON.parse(JSON.stringify(DEFAULT_PRICING));

  // Start with a full deep clone of defaults
  const base: PricingData = JSON.parse(JSON.stringify(DEFAULT_PRICING));

  // Shallow-merge top-level primitives and simple objects
  for (const key of Object.keys(raw) as (keyof PricingData)[]) {
    const val = raw[key];
    if (val === undefined || val === null) continue;

    if (key === 'mdfSelling' || key === 'mdfCost') {
      const mdfVal = val as any;
      const defaultMdf = base[key];
      base[key] = {
        narrow: normalizeMdfWidth(mdfVal?.narrow, defaultMdf.narrow),
        wide: normalizeMdfWidth(mdfVal?.wide, defaultMdf.wide),
      };
    } else if (key === 'architraveFlat') {
      base.architraveFlat = !!val;
    } else if (typeof val === 'object' && !Array.isArray(val)) {
      (base as any)[key] = { ...(base as any)[key], ...(val as any) };
    } else {
      (base as any)[key] = val;
    }
  }

  // --- Backward compatibility: migrate legacy `extras` and `wasteDisposal` ---
  const rawAny = raw as any;
  if (rawAny.extras && !rawAny.extrasSelling) {
    base.extrasSelling = { ...base.extrasSelling, ...rawAny.extras };
    base.extrasCost = { ...base.extrasCost, ...rawAny.extras };
  }
  if (rawAny.wasteDisposal != null && rawAny.wasteDisposalSelling == null) {
    base.wasteDisposalSelling = rawAny.wasteDisposal;
    base.wasteDisposalCost = rawAny.wasteDisposal;
  }

  return base;
}
