import type { QuoteLineItem, ProjectSettings, QuoteSummary, PricingData } from './types';
import { DEFAULT_PRICING } from './context';

function loadGlobalPricing(): PricingData {
  const saved = localStorage.getItem('quote-pricing');
  return saved ? { ...DEFAULT_PRICING, ...JSON.parse(saved) } : DEFAULT_PRICING;
}

function p(quotePricing?: PricingData): PricingData {
  return quotePricing || loadGlobalPricing();
}

export const WINDOW_INSTALLATION_SELLING = loadGlobalPricing().installationSelling;
export const CONSUMABLES = loadGlobalPricing().consumables;
export const OVERHEAD_PER_DAY = loadGlobalPricing().overheadPerDay;

export function calculateSm(widthMm: number, heightMm: number): number {
  return (widthMm / 1000) * (heightMm / 1000);
}

export function calculateLm(widthMm: number, heightMm: number): number {
  return ((widthMm + heightMm) * 2) / 1000;
}

/** Architrave LM = (Width + 2×Height) / 1000 */
export function calculateArchitraveLm(widthMm: number, heightMm: number): number {
  return (widthMm + 2 * heightMm) / 1000;
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

  // Material: ROUND(Manufacture_price_£ × (1 + Uplift%), 0)
  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  b.material = Math.round(materialGbp * (1 + item.uplift / 100));

  if (!settings.supplyOnly) {
    // Installation: flat rate per type
    b.installation = pricing.installationSelling[item.type] || 0;

    // Architrave: LM × rate/LM
    if (item.includeArchitrave) {
      const archLm = calculateArchitraveLm(item.widthMm, item.heightMm);
      b.architrave = archLm * pricing.architraveSelling;
    }

    // Trims: flat rate per item
    if (item.includeTrims) b.trims = pricing.trimsSelling;

    // MDF Reveal: flat rate per type
    if (item.includeMdfReveal && item.mdfRevealType !== 'none') {
      b.mdfReveal = pricing.mdfSelling[item.mdfRevealType] || 0;
    }

    // Making Good: depends on installation type
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

    // Waste Disposal: flat rate per item
    if (settings.includeWasteDisposal) b.wasteDisposal = pricing.wasteDisposal;

    // Delivery/Stock: Area_SM × rate/SM
    const areaSm = calculateSm(item.widthMm, item.heightMm);
    b.deliveryStock = areaSm * pricing.deliveryStockSelling;

    // Fensa/Survey: flat rate per item
    b.fensaSurvey = pricing.fensaSurveySelling;

    // Extras
    for (const extra of item.extras) {
      b.extras += pricing.extras[extra] || 0;
    }
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

  // Material: raw cost (no uplift)
  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  b.material = materialGbp;

  if (!settings.supplyOnly) {
    b.installation = pricing.installationCost[item.type] || 0;

    if (item.includeArchitrave) {
      const archLm = calculateArchitraveLm(item.widthMm, item.heightMm);
      b.architrave = archLm * pricing.architraveCost;
    }

    if (item.includeTrims) b.trims = pricing.trimsCost;

    if (item.includeMdfReveal && item.mdfRevealType !== 'none') {
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

    for (const extra of item.extras) {
      b.extras += pricing.extras[extra] || 0;
    }

    // Consumables per item
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
