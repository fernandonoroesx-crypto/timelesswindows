import type { QuoteLineItem, ProjectSettings, QuoteSummary, PricingData } from './types';
import { DEFAULT_PRICING } from './context';

import { normalizePricingData } from './pricing-normalize';

function p(quotePricing?: PricingData): PricingData {
  return normalizePricingData(quotePricing);
}

export function calculateSm(widthMm: number, heightMm: number): number {
  return (widthMm * heightMm) / 1_000_000;
}

export function calculateLm(widthMm: number, heightMm: number): number {
  return ((2 * widthMm) + (2 * heightMm)) / 1000;
}

/** Calculate LM based on placement type:
 *  Single: (2×Height + Width) / 1000
 *  Bay Side: (Height + Width) / 1000
 *  Bay Central: Width / 1000
 */
export function calculateTypeLm(type: string, widthMm: number, heightMm: number): number {
  switch (type) {
    case 'single': return (widthMm + 2 * heightMm) / 1000;
    case 'baySide': return (widthMm + heightMm) / 1000;
    case 'bayCentral': return widthMm / 1000;
    default: return 0;
  }
}

export interface PriceBreakdown {
  material: number;
  installation: number;
  internalMakingGood: number;
  externalMakingGood: number;
  architrave: number;
  trims: number;
  mdfReveal: number;
  wasteDisposal: number;
  deliveryStock: number;
  fensaSurvey: number;
  extras: number;
  consumables: number;
  overhead: number;
  unitTotal: number;
  total: number;
}

export function getItemSellingBreakdown(item: QuoteLineItem, settings: ProjectSettings, quotePricing?: PricingData): PriceBreakdown {
  const pricing = p(quotePricing);
  const b: PriceBreakdown = {
    material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
    architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, deliveryStock: 0,
    fensaSurvey: 0, extras: 0, consumables: 0, overhead: 0, unitTotal: 0, total: 0,
  };

  // Material: ROUND(Manufacture_price_£ × Uplift, 0)
  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  const upliftMultiplier = item.uplift != null && item.uplift !== 0
    ? item.uplift
    : (pricing.uplift[item.type] || 1);
  b.material = Math.round(materialGbp * upliftMultiplier);

  if (!settings.supplyOnly) {
    // Installation: flat rate per type, or override
    b.installation = item.installationOverride != null
      ? item.installationOverride
      : (pricing.installationSelling[item.type] || 0);

    // Architrave selling: flat override, flat rate (if architraveFlat), or LM × rate
    if (item.architraveType !== 'none') {
      if (item.architraveOverride != null) {
        b.architrave = item.architraveOverride;
      } else if (pricing.architraveFlat) {
        b.architrave = pricing.architraveSelling[item.architraveType] || 0;
      } else {
        const archLm = calculateTypeLm(item.architraveType, item.widthMm, item.heightMm);
        b.architrave = archLm * (pricing.architraveSelling[item.architraveType] || 0);
      }
    }

    // Trims: flat rate per type
    if (item.trimsType !== 'none') {
      const trimLm = calculateTypeLm(item.trimsType, item.widthMm, item.heightMm);
      b.trims = trimLm * (pricing.trimsSelling[item.trimsType] || 0);
    }

    // MDF Reveal: LM × rate per type
    if (item.mdfRevealType !== 'none') {
      const mdfLm = calculateTypeLm(item.mdfRevealType, item.widthMm, item.heightMm);
      const widthType = item.mdfWidthType || 'narrow';
      const mdfRates = pricing.mdfSelling[widthType] || pricing.mdfSelling.narrow || { single: 0, baySide: 0, bayCentral: 0 };
      b.mdfReveal = mdfLm * (mdfRates[item.mdfRevealType] || 0);
    }

    // Making Good: LM (single formula) × rate
    const mkgLm = calculateTypeLm('single', item.widthMm, item.heightMm);
    if (settings.includeInternalMakingGood) {
      b.internalMakingGood = mkgLm * (item.installationType === 'Internal'
        ? pricing.makingGoodSelling.intMkgInternal
        : pricing.makingGoodSelling.intMkgExternal);
    }
    if (settings.includeExternalMakingGood) {
      b.externalMakingGood = mkgLm * (item.installationType === 'Internal'
        ? pricing.makingGoodSelling.extMkgInternal
        : pricing.makingGoodSelling.extMkgExternal);
    }

    // Waste Disposal
    if (settings.includeWasteDisposal) b.wasteDisposal = pricing.wasteDisposal;

    // Extras from slots
    if (item.extra1 !== 'none') b.extras += pricing.extras[item.extra1] || 0;
    if (item.extra2 !== 'none') b.extras += pricing.extras[item.extra2] || 0;
    b.extras += item.customExtra || 0;
  }

  b.unitTotal = b.material + b.installation + b.architrave + b.trims + b.mdfReveal
    + b.internalMakingGood + b.externalMakingGood + b.wasteDisposal + b.extras;
  b.total = b.unitTotal * item.qty;

  return b;
}

export function getItemCostBreakdown(item: QuoteLineItem, settings: ProjectSettings, quotePricing?: PricingData): PriceBreakdown {
  const pricing = p(quotePricing);
  const b: PriceBreakdown = {
    material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
    architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, deliveryStock: 0,
    fensaSurvey: 0, extras: 0, consumables: 0, overhead: 0, unitTotal: 0, total: 0,
  };

  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  b.material = materialGbp;

  if (!settings.supplyOnly) {
    b.installation = pricing.installationCost[item.type] || 0;

    // Architrave cost: always LM × rate regardless of flat selling flag
    if (item.architraveType !== 'none') {
      const archLm = calculateTypeLm(item.architraveType, item.widthMm, item.heightMm);
      b.architrave = archLm * (pricing.architraveCost[item.architraveType] || 0);
    }

    if (item.trimsType !== 'none') {
      const trimLm = calculateTypeLm(item.trimsType, item.widthMm, item.heightMm);
      b.trims = trimLm * (pricing.trimsCost[item.trimsType] || 0);
    }

    if (item.mdfRevealType !== 'none') {
      const mdfLm = calculateTypeLm(item.mdfRevealType, item.widthMm, item.heightMm);
      const widthType = item.mdfWidthType || 'narrow';
      const mdfRates = pricing.mdfCost[widthType] || pricing.mdfCost.narrow || { single: 0, baySide: 0, bayCentral: 0 };
      b.mdfReveal = mdfLm * (mdfRates[item.mdfRevealType] || 0);
    }

    // Making Good cost: LM (single formula) × rate
    const mkgLm = calculateTypeLm('single', item.widthMm, item.heightMm);
    if (settings.includeInternalMakingGood) {
      b.internalMakingGood = mkgLm * (item.installationType === 'Internal'
        ? pricing.makingGoodCost.intMkgInternal
        : pricing.makingGoodCost.intMkgExternal);
    }
    if (settings.includeExternalMakingGood) {
      b.externalMakingGood = mkgLm * (item.installationType === 'Internal'
        ? pricing.makingGoodCost.extMkgInternal
        : pricing.makingGoodCost.extMkgExternal);
    }

    if (settings.includeWasteDisposal) b.wasteDisposal = pricing.wasteDisposal;

    const areaSm = calculateSm(item.widthMm, item.heightMm);
    b.deliveryStock = areaSm * pricing.deliveryStockCost;
    b.fensaSurvey = pricing.fensaSurveyCost;

    if (item.extra1 !== 'none') b.extras += pricing.extras[item.extra1] || 0;
    if (item.extra2 !== 'none') b.extras += pricing.extras[item.extra2] || 0;
    b.extras += item.customExtra || 0;

    b.consumables = Object.values(pricing.consumables).reduce((a, v) => a + v, 0);
  }

  b.unitTotal = b.material + b.installation + b.architrave + b.trims + b.mdfReveal
    + b.internalMakingGood + b.externalMakingGood + b.wasteDisposal
    + b.deliveryStock + b.fensaSurvey + b.extras + b.consumables;
  b.total = b.unitTotal * item.qty;

  return b;
}

export function calculateItemSelling(item: QuoteLineItem, settings: ProjectSettings, quotePricing?: PricingData): number {
  return getItemSellingBreakdown(item, settings, quotePricing).total;
}

export function calculateItemCost(item: QuoteLineItem, settings: ProjectSettings, quotePricing?: PricingData): number {
  return getItemCostBreakdown(item, settings, quotePricing).total;
}

export function calculateQuoteSummary(items: QuoteLineItem[], settings: ProjectSettings, quotePricing?: PricingData): QuoteSummary {
  const sp = { material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0, architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, deliveryStock: 0, fensaSurvey: 0, extras: 0, consumables: 0, overhead: 0, total: 0 };
  const cp = { ...sp };
  let totalSm = 0;

  for (const item of items) {
    const sb = getItemSellingBreakdown(item, settings, quotePricing);
    const cb = getItemCostBreakdown(item, settings, quotePricing);
    const keys: (keyof PriceBreakdown)[] = ['material', 'installation', 'internalMakingGood', 'externalMakingGood', 'architrave', 'trims', 'mdfReveal', 'wasteDisposal', 'deliveryStock', 'fensaSurvey', 'extras', 'consumables', 'overhead'];
    for (const k of keys) {
      sp[k] += sb[k] * item.qty;
      cp[k] += cb[k] * item.qty;
    }
    sp.total += sb.total;
    cp.total += cb.total;
    totalSm += calculateSm(item.widthMm, item.heightMm) * item.qty;
  }

  const pricing = p(quotePricing);
  const overhead = settings.overheadDays * pricing.overheadPerDay;
  cp.overhead = overhead;
  cp.total += overhead;

  const profit = sp.total - cp.total;
  const margin = sp.total > 0 ? (profit / sp.total) * 100 : 0;

  return {
    sellingPrice: sp,
    costPrice: cp,
    profit,
    margin,
    totalItems: items.reduce((sum, i) => sum + i.qty, 0),
    totalSm,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}
