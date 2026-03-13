import type { QuoteLineItem, ProjectSettings, QuoteSummary } from './types';

// Load editable pricing from localStorage
function loadPricing() {
  const saved = localStorage.getItem('quote-pricing');
  return saved ? JSON.parse(saved) : null;
}

function p() {
  const saved = loadPricing();
  return {
    installationSelling: saved?.installationSelling ?? {
      'Casement': 90, 'Casement Flag': 50, 'Box Sash': 150, 'Fix Sash': 125,
      'Spring Sash': 125, 'Door': 125, 'Door + Top Light': 175, 'French Door': 175, 'Patio Door': 175,
    },
    installationCost: saved?.installationCost ?? {
      'Casement': 45, 'Casement Flag': 25, 'Box Sash': 75, 'Fix Sash': 62.5,
      'Spring Sash': 62.5, 'Door': 62.5, 'Door + Top Light': 87.5, 'French Door': 87.5, 'Patio Door': 87.5,
    },
    makingGoodSelling: saved?.makingGoodSelling ?? { intMkgInternal: 12.50, extMkgInternal: 16.00, intMkgExternal: 8.00, extMkgExternal: 12.00 },
    makingGoodCost: saved?.makingGoodCost ?? { intMkgInternal: 7.00, extMkgInternal: 8.00, intMkgExternal: 4.00, extMkgExternal: 6.00 },
    architraveSelling: saved?.architraveSelling ?? 6.50,
    architraveCost: saved?.architraveCost ?? 4.50,
    trimsSelling: saved?.trimsSelling ?? 4.00,
    trimsCost: saved?.trimsCost ?? 1.00,
    mdfSelling: saved?.mdfSelling ?? { narrow: 17.50, wide: 35.00 },
    mdfCost: saved?.mdfCost ?? { narrow: 9.00, wide: 18.00 },
    extras: saved?.extras ?? { 'Recess of reveal': 75, 'Shutters': 100, 'Cut Out of work top': 125 },
    consumables: saved?.consumables ?? {
      'Survey': 15.00, 'Delivery Stock': 40.00, 'Carpet protection': 6.40, 'Correx': 5.25,
      'Dust Sheets': 1.20, 'Masking tape': 0.75, 'Blue paper': 0.76, 'Rubbish bag': 0.50,
      'Screws for Brackets': 0.64, 'Screws for Windows': 0.30, 'Packer': 0.70, 'Plugs': 1.15,
      'Foam': 4.20, 'DPC': 0.15, 'Silicone': 0.45, 'Caulk': 1.17,
    },
    wasteDisposal: saved?.wasteDisposal ?? 35.00,
    overheadPerDay: saved?.overheadPerDay ?? 2000.00,
  };
}

// Re-export for settings page
export const WINDOW_INSTALLATION_SELLING = p().installationSelling;
export const CONSUMABLES = p().consumables;
export const OVERHEAD_PER_DAY = p().overheadPerDay;

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

export function getItemSellingBreakdown(item: QuoteLineItem, settings: ProjectSettings): PriceBreakdown {
  const pricing = p();
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

export function getItemCostBreakdown(item: QuoteLineItem, settings: ProjectSettings): PriceBreakdown {
  const pricing = p();
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
