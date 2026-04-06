import type { QuoteLineItem, ProjectSettings, QuoteSummary, PricingData } from './types';
import { DEFAULT_PRICING } from './context';

function p(quotePricing?: PricingData): PricingData {
  if (!quotePricing) return DEFAULT_PRICING;
  return { ...DEFAULT_PRICING, ...quotePricing, uplift: quotePricing.uplift || DEFAULT_PRICING.uplift };
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
  unitTotal: number;
  total: number;
}

export function getItemSellingBreakdown(item: QuoteLineItem, settings: ProjectSettings, quotePricing?: PricingData): PriceBreakdown {
  const pricing = p(quotePricing);
  const b: PriceBreakdown = {
    material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
    architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, deliveryStock: 0,
    fensaSurvey: 0, extras: 0, consumables: 0, unitTotal: 0, total: 0,
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

    // Architrave: LM × rate per type
    if (item.architraveType !== 'none') {
      const archLm = calculateArchitraveLm(item.widthMm, item.heightMm);
      b.architrave = archLm * (pricing.architraveSelling[item.architraveType] || 0);
    }

    // Trims: flat rate per type
    if (item.trimsType !== 'none') {
      b.trims = pricing.trimsSelling[item.trimsType] || 0;
    }

    // MDF Reveal: flat rate per width
    if (item.mdfRevealType !== 'none') {
      b.mdfReveal = pricing.mdfSelling[item.mdfRevealType] || 0;
    }

    // Making Good
    if (settings.includeInternalMakingGood) {
      b.internalMakingGood = item.installationType === 'Internal'
        ? pricing.makingGoodSelling.intMkgInternal
        : pricing.makingGoodSelling.intMkgExternal;
    }
    if (settings.includeExternalMakingGood) {
      b.externalMakingGood = item.installationType === 'Internal'
        ? pricing.makingGoodSelling.extMkgInternal
        : pricing.makingGoodSelling.extMkgExternal;
    }

    // Waste Disposal
    if (settings.includeWasteDisposal) b.wasteDisposal = pricing.wasteDisposal;

    // Delivery/Stock: Area_SM × rate/SM
    const areaSm = calculateSm(item.widthMm, item.heightMm);
    b.deliveryStock = areaSm * pricing.deliveryStockSelling;

    // Fensa/Survey
    b.fensaSurvey = pricing.fensaSurveySelling;

    // Extras from slots
    if (item.extra1 !== 'none') b.extras += pricing.extras[item.extra1] || 0;
    if (item.extra2 !== 'none') b.extras += pricing.extras[item.extra2] || 0;
    b.extras += item.customExtra || 0;
  }

  b.unitTotal = b.material + b.installation + b.architrave + b.trims + b.mdfReveal
    + b.internalMakingGood + b.externalMakingGood + b.wasteDisposal
    + b.deliveryStock + b.fensaSurvey + b.extras;
  b.total = b.unitTotal * item.qty;

  return b;
}

export function getItemCostBreakdown(item: QuoteLineItem, settings: ProjectSettings, quotePricing?: PricingData): PriceBreakdown {
  const pricing = p(quotePricing);
  const b: PriceBreakdown = {
    material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
    architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, deliveryStock: 0,
    fensaSurvey: 0, extras: 0, consumables: 0, unitTotal: 0, total: 0,
  };

  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  b.material = materialGbp;

  if (!settings.supplyOnly) {
    b.installation = pricing.installationCost[item.type] || 0;

    if (item.architraveType !== 'none') {
      const archLm = calculateArchitraveLm(item.widthMm, item.heightMm);
      b.architrave = archLm * (pricing.architraveCost[item.architraveType] || 0);
    }

    if (item.trimsType !== 'none') {
      b.trims = pricing.trimsCost[item.trimsType] || 0;
    }

    if (item.mdfRevealType !== 'none') {
      b.mdfReveal = pricing.mdfCost[item.mdfRevealType] || 0;
    }

    if (settings.includeInternalMakingGood) {
      b.internalMakingGood = item.installationType === 'Internal'
        ? pricing.makingGoodCost.intMkgInternal
        : pricing.makingGoodCost.intMkgExternal;
    }
    if (settings.includeExternalMakingGood) {
      b.externalMakingGood = item.installationType === 'Internal'
        ? pricing.makingGoodCost.extMkgInternal
        : pricing.makingGoodCost.extMkgExternal;
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
  let totalSelling = 0;
  let totalCost = 0;
  let totalSm = 0;

  for (const item of items) {
    totalSelling += calculateItemSelling(item, settings, quotePricing);
    totalCost += calculateItemCost(item, settings, quotePricing);
    totalSm += calculateSm(item.widthMm, item.heightMm) * item.qty;
  }

  const pricing = p(quotePricing);
  const overhead = settings.overheadDays * pricing.overheadPerDay;
  totalCost += overhead;

  const profit = totalSelling - totalCost;
  const margin = totalSelling > 0 ? (profit / totalSelling) * 100 : 0;

  return {
    sellingPrice: {
      material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
      architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, deliveryStock: 0,
      fensaSurvey: 0, extras: 0, consumables: 0, overhead: 0, total: totalSelling,
    },
    costPrice: {
      material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
      architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, deliveryStock: 0,
      fensaSurvey: 0, extras: 0, consumables: 0, overhead, total: totalCost,
    },
    profit,
    margin,
    totalItems: items.reduce((sum, i) => sum + i.qty, 0),
    totalSm,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}
