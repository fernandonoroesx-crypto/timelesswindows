import type { WindowType, InstallationType, ExtraType, QuoteLineItem, ProjectSettings, QuoteSummary, CostBreakdown } from './types';

// === SELLING PRICES ===
export const INSTALLATION_SELLING: Record<InstallationType, { installation: number; intMkg: number; extMkg: number }> = {
  Internal: { installation: 0, intMkg: 12.50, extMkg: 16.00 },
  External: { installation: 0, intMkg: 8.00, extMkg: 12.00 },
};

export const INSTALLATION_COST: Record<InstallationType, { installation: number; intMkg: number; extMkg: number }> = {
  Internal: { installation: 0, intMkg: 7.00, extMkg: 8.00 },
  External: { installation: 0, intMkg: 4.00, extMkg: 6.00 },
};

export const WINDOW_INSTALLATION_SELLING: Record<WindowType, number> = {
  'Casement': 90,
  'Casement Flag': 50,
  'Box Sash': 150,
  'Fix Sash': 125,
  'Spring Sash': 125,
  'Door': 125,
  'Door + Top Light': 175,
  'French Door': 175,
  'Patio Door': 175,
};

export const TRIMS_SELLING = 4.00;
export const TRIMS_COST = 1.00;

export const MDF_SELLING = { narrow: 17.50, wide: 35.00 };
export const MDF_COST = { narrow: 9.00, wide: 18.00 };

export const EXTRAS_SELLING: Record<ExtraType, number> = {
  'Recess of reveal': 75,
  'Shutters': 100,
  'Cut Out of work top': 125,
};
export const EXTRAS_COST: Record<ExtraType, number> = {
  'Recess of reveal': 75,
  'Shutters': 100,
  'Cut Out of work top': 125,
};

export const ARCHITRAVE_SELLING = 6.50;
export const ARCHITRAVE_COST = 4.50;

export const WASTE_DISPOSAL = 35.00;
export const OVERHEAD_PER_DAY = 2000.00;

export const CONSUMABLES: Record<string, number> = {
  'Survey': 15.00,
  'Delivery Stock': 40.00,
  'Carpet protection': 6.40,
  'Correx': 5.25,
  'Dust Sheets': 1.20,
  'Masking tape': 0.75,
  'Blue paper': 0.76,
  'Rubbish bag': 0.50,
  'Screws for Brackets': 0.64,
  'Screws for Windows': 0.30,
  'Packer': 0.70,
  'Plugs': 1.15,
  'Foam': 4.20,
  'DPC': 0.15,
  'Silicone': 0.45,
  'Caulk': 1.17,
};

export const CONSUMABLES_TOTAL_PER_ITEM = Object.values(CONSUMABLES).reduce((a, b) => a + b, 0);

export function calculateSm(widthMm: number, heightMm: number): number {
  return (widthMm / 1000) * (heightMm / 1000);
}

export function calculateLm(widthMm: number, heightMm: number): number {
  return ((widthMm + heightMm) * 2) / 1000;
}

export function calculateItemSelling(item: QuoteLineItem, settings: ProjectSettings): number {
  const sm = calculateSm(item.widthMm, item.heightMm);
  let total = 0;

  // Material (manufacture price converted + uplift)
  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  total += materialGbp * (1 + item.uplift / 100);

  if (!settings.supplyOnly) {
    // Installation
    total += WINDOW_INSTALLATION_SELLING[item.type] || 0;

    // Making good
    if (settings.includeInternalMakingGood) {
      total += INSTALLATION_SELLING[item.installationType].intMkg;
    }
    if (settings.includeExternalMakingGood) {
      total += INSTALLATION_SELLING[item.installationType].extMkg;
    }

    // Architrave
    if (item.includeArchitrave) {
      total += ARCHITRAVE_SELLING;
    }

    // Trims
    if (item.includeTrims) {
      total += TRIMS_SELLING;
    }

    // MDF Reveal
    if (item.includeMdfReveal && item.mdfRevealType !== 'none') {
      total += MDF_SELLING[item.mdfRevealType];
    }

    // Extras
    for (const extra of item.extras) {
      total += EXTRAS_SELLING[extra];
    }

    // Waste disposal
    if (settings.includeWasteDisposal) {
      total += WASTE_DISPOSAL;
    }
  }

  return total * item.qty;
}

export function calculateItemCost(item: QuoteLineItem, settings: ProjectSettings): number {
  let total = 0;

  const materialGbp = item.manufactureCurrency === 'EUR'
    ? item.manufacturePrice * settings.eurToGbpRate
    : item.manufacturePrice;
  total += materialGbp;

  if (!settings.supplyOnly) {
    // Installation cost (use same as selling for now — adjust if you have cost data)
    total += (WINDOW_INSTALLATION_SELLING[item.type] || 0) * 0.5; // assume 50% margin on installation

    if (settings.includeInternalMakingGood) {
      total += INSTALLATION_COST[item.installationType].intMkg;
    }
    if (settings.includeExternalMakingGood) {
      total += INSTALLATION_COST[item.installationType].extMkg;
    }

    if (item.includeArchitrave) total += ARCHITRAVE_COST;
    if (item.includeTrims) total += TRIMS_COST;
    if (item.includeMdfReveal && item.mdfRevealType !== 'none') {
      total += MDF_COST[item.mdfRevealType];
    }

    for (const extra of item.extras) {
      total += EXTRAS_COST[extra];
    }

    if (settings.includeWasteDisposal) total += WASTE_DISPOSAL;

    // Consumables per item
    total += CONSUMABLES_TOTAL_PER_ITEM;
  }

  return total * item.qty;
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

  // Add overhead
  const overhead = settings.overheadDays * OVERHEAD_PER_DAY;
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
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}
