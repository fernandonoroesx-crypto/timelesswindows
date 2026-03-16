import type { QuoteLineItem, ProjectSettings, QuoteSummary, PricingData } from './types';
import { DEFAULT_PRICING } from './context';

// Load global pricing from localStorage (used as default for new projects)
function loadGlobalPricing(): PricingData {
  const saved = localStorage.getItem('quote-pricing');
  return saved ? { ...DEFAULT_PRICING, ...JSON.parse(saved) } : DEFAULT_PRICING;
}

// Get pricing for calculations — accepts optional per-quote pricing
function p(quotePricing?: PricingData): PricingData {
  return quotePricing || loadGlobalPricing();
}

// Re-export for settings page
export const WINDOW_INSTALLATION_SELLING = loadGlobalPricing().installationSelling;
export const CONSUMABLES = loadGlobalPricing().consumables;
export const OVERHEAD_PER_DAY = loadGlobalPricing().overheadPerDay;

export function calculateSm(widthMm: number, heightMm: number): number {
  return (widthMm / 1000) * (heightMm / 1000);
}

export function calculateLm(widthMm: number, heightMm: number): number {
  return ((widthMm + heightMm) * 2) / 1000;
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
  extras: number;
  unitTotal: number;
  total: number;
}

export function getItemSellingBreakdown(item: QuoteLineItem, settings: ProjectSettings, quotePricing?: PricingData): PriceBreakdown {
  const pricing = p(quotePricing);
  const b: PriceBreakdown = {
    material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
    architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, extras: 0, unitTotal: 0, total: 0,
  };

  // Material
  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  b.material = materialGbp * (1 + item.uplift / 100);

  if (!settings.supplyOnly) {
    b.installation = pricing.installationSelling[item.type] || 0;

    if (settings.includeInternalMakingGood) {
      const key = item.installationType === 'Internal' ? 'intMkgInternal' : 'intMkgExternal';
      b.internalMakingGood = pricing.makingGoodSelling[key];
    }
    if (settings.includeExternalMakingGood) {
      const key = item.installationType === 'Internal' ? 'extMkgInternal' : 'extMkgExternal';
      b.externalMakingGood = pricing.makingGoodSelling[key];
    }

    if (item.includeArchitrave) b.architrave = pricing.architraveSelling;
    if (item.includeTrims) b.trims = pricing.trimsSelling;
    if (item.includeMdfReveal && item.mdfRevealType !== 'none') {
      b.mdfReveal = pricing.mdfSelling[item.mdfRevealType];
    }

    for (const extra of item.extras) {
      b.extras += pricing.extras[extra] || 0;
    }

    if (settings.includeWasteDisposal) b.wasteDisposal = pricing.wasteDisposal;
  }

  b.unitTotal = b.material + b.installation + b.internalMakingGood + b.externalMakingGood
    + b.architrave + b.trims + b.mdfReveal + b.wasteDisposal + b.extras;
  b.total = b.unitTotal * item.qty;

  return b;
}

export function getItemCostBreakdown(item: QuoteLineItem, settings: ProjectSettings, quotePricing?: PricingData): PriceBreakdown {
  const pricing = p(quotePricing);
  const b: PriceBreakdown = {
    material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
    architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, extras: 0, unitTotal: 0, total: 0,
  };

  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  b.material = materialGbp;

  if (!settings.supplyOnly) {
    b.installation = pricing.installationCost[item.type] || 0;

    if (settings.includeInternalMakingGood) {
      const key = item.installationType === 'Internal' ? 'intMkgInternal' : 'intMkgExternal';
      b.internalMakingGood = pricing.makingGoodCost[key];
    }
    if (settings.includeExternalMakingGood) {
      const key = item.installationType === 'Internal' ? 'extMkgInternal' : 'extMkgExternal';
      b.externalMakingGood = pricing.makingGoodCost[key];
    }

    if (item.includeArchitrave) b.architrave = pricing.architraveCost;
    if (item.includeTrims) b.trims = pricing.trimsCost;
    if (item.includeMdfReveal && item.mdfRevealType !== 'none') {
      b.mdfReveal = pricing.mdfCost[item.mdfRevealType];
    }

    for (const extra of item.extras) {
      b.extras += pricing.extras[extra] || 0;
    }

    if (settings.includeWasteDisposal) b.wasteDisposal = pricing.wasteDisposal;

    // Consumables
    const consumablesTotal = Object.values(pricing.consumables).reduce((a, b) => (a as number) + (b as number), 0) as number;
    b.extras += consumablesTotal; // lump into extras for cost
  }

  b.unitTotal = b.material + b.installation + b.internalMakingGood + b.externalMakingGood
    + b.architrave + b.trims + b.mdfReveal + b.wasteDisposal + b.extras;
  b.total = b.unitTotal * item.qty;

  return b;
}

export function calculateItemSelling(item: QuoteLineItem, settings: ProjectSettings): number {
  return getItemSellingBreakdown(item, settings).total;
}

export function calculateItemCost(item: QuoteLineItem, settings: ProjectSettings): number {
  return getItemCostBreakdown(item, settings).total;
}

export function calculateQuoteSummary(items: QuoteLineItem[], settings: ProjectSettings): QuoteSummary {
  let totalSelling = 0;
  let totalCost = 0;
  let totalSm = 0;

  for (const item of items) {
    totalSelling += calculateItemSelling(item, settings);
    totalCost += calculateItemCost(item, settings);
    totalSm += calculateSm(item.widthMm, item.heightMm) * item.qty;
  }

  const pricing = p();
  const overhead = settings.overheadDays * pricing.overheadPerDay;
  totalCost += overhead;

  const profit = totalSelling - totalCost;
  const margin = totalSelling > 0 ? (profit / totalSelling) * 100 : 0;

  return {
    sellingPrice: {
      material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
      architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, extras: 0,
      consumables: 0, overhead: 0, total: totalSelling,
    },
    costPrice: {
      material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
      architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0, extras: 0,
      consumables: 0, overhead, total: totalCost,
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
