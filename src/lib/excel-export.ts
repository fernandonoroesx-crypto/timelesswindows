import * as XLSX from 'xlsx';
import type { Project } from './types';
import { getItemSellingBreakdown, getItemCostBreakdown, calculateQuoteSummary, formatCurrency } from './pricing';
import { getProjectPricing } from './context';

export function exportQuoteExcel(project: Project) {
  const pricing = project.pricing || getProjectPricing(project);
  const wb = XLSX.utils.book_new();

  // Header row
  const headers = [
    'Proj Ref', 'Item Ref', 'Qty', 'Type', 'Width (mm)', 'Height (mm)',
    'Material', 'Installation', 'Int. Making Good', 'Ext. Making Good',
    'Architrave', 'Trims', 'MDF Reveal', 'Waste Disposal',
    'Delivery/Stock', 'FENSA/Survey', 'Extra1', 'Extra2', 'Custom Extra',
    'Unit Total', 'Total'
  ];

  const rows: any[][] = [headers];

  // Selling totals accumulators
  const sellingTotals = {
    material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
    architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0,
    deliveryStock: 0, fensaSurvey: 0, extras1: 0, extras2: 0, customExtra: 0,
    unitTotal: 0, total: 0,
  };
  const costTotals = { ...sellingTotals };

  for (const item of project.lineItems) {
    const sb = getItemSellingBreakdown(item, project.settings, pricing);
    const extra1Val = item.extra1 !== 'none' ? (pricing.extras[item.extra1] || 0) : 0;
    const extra2Val = item.extra2 !== 'none' ? (pricing.extras[item.extra2] || 0) : 0;

    rows.push([
      project.projectRef,
      item.itemRef,
      item.qty,
      item.type,
      item.widthMm,
      item.heightMm,
      sb.material,
      sb.installation,
      sb.internalMakingGood,
      sb.externalMakingGood,
      sb.architrave,
      sb.trims,
      sb.mdfReveal,
      sb.wasteDisposal,
      sb.deliveryStock,
      sb.fensaSurvey,
      extra1Val,
      extra2Val,
      item.customExtra || 0,
      sb.unitTotal,
      sb.total,
    ]);

    // Accumulate selling totals
    sellingTotals.material += sb.material * item.qty;
    sellingTotals.installation += sb.installation * item.qty;
    sellingTotals.internalMakingGood += sb.internalMakingGood * item.qty;
    sellingTotals.externalMakingGood += sb.externalMakingGood * item.qty;
    sellingTotals.architrave += sb.architrave * item.qty;
    sellingTotals.trims += sb.trims * item.qty;
    sellingTotals.mdfReveal += sb.mdfReveal * item.qty;
    sellingTotals.wasteDisposal += sb.wasteDisposal * item.qty;
    sellingTotals.deliveryStock += sb.deliveryStock * item.qty;
    sellingTotals.fensaSurvey += sb.fensaSurvey * item.qty;
    sellingTotals.extras1 += extra1Val * item.qty;
    sellingTotals.extras2 += extra2Val * item.qty;
    sellingTotals.customExtra += (item.customExtra || 0) * item.qty;
    sellingTotals.unitTotal += sb.unitTotal * item.qty;
    sellingTotals.total += sb.total;

    // Accumulate cost totals
    const cb = getItemCostBreakdown(item, project.settings, pricing);
    costTotals.material += cb.material * item.qty;
    costTotals.installation += cb.installation * item.qty;
    costTotals.internalMakingGood += cb.internalMakingGood * item.qty;
    costTotals.externalMakingGood += cb.externalMakingGood * item.qty;
    costTotals.architrave += cb.architrave * item.qty;
    costTotals.trims += cb.trims * item.qty;
    costTotals.mdfReveal += cb.mdfReveal * item.qty;
    costTotals.wasteDisposal += cb.wasteDisposal * item.qty;
    costTotals.deliveryStock += cb.deliveryStock * item.qty;
    costTotals.fensaSurvey += cb.fensaSurvey * item.qty;
    costTotals.extras1 += extra1Val * item.qty;
    costTotals.extras2 += extra2Val * item.qty;
    costTotals.customExtra += (item.customExtra || 0) * item.qty;
    costTotals.unitTotal += cb.unitTotal * item.qty;
    costTotals.total += cb.total;
  }

  // Totals row
  const totalQty = project.lineItems.reduce((s, i) => s + i.qty, 0);
  rows.push([
    '', 'TOTALS', totalQty, '', '', '',
    sellingTotals.material, sellingTotals.installation,
    sellingTotals.internalMakingGood, sellingTotals.externalMakingGood,
    sellingTotals.architrave, sellingTotals.trims, sellingTotals.mdfReveal,
    sellingTotals.wasteDisposal, sellingTotals.deliveryStock, sellingTotals.fensaSurvey,
    sellingTotals.extras1, sellingTotals.extras2, sellingTotals.customExtra,
    sellingTotals.unitTotal, sellingTotals.total,
  ]);

  // Blank row
  rows.push([]);

  // Breakdown section
  rows.push(['BREAKDOWN', '', 'Selling', 'Cost', 'Margin']);
  const overhead = project.settings.overheadDays * (pricing.overheadPerDay || 0);
  const breakdownCategories = [
    ['Material', sellingTotals.material, costTotals.material],
    ['Installation', sellingTotals.installation, costTotals.installation],
    ['Int. Making Good', sellingTotals.internalMakingGood, costTotals.internalMakingGood],
    ['Ext. Making Good', sellingTotals.externalMakingGood, costTotals.externalMakingGood],
    ['Architrave', sellingTotals.architrave, costTotals.architrave],
    ['Trims', sellingTotals.trims, costTotals.trims],
    ['MDF Reveal', sellingTotals.mdfReveal, costTotals.mdfReveal],
    ['Waste Disposal', sellingTotals.wasteDisposal, costTotals.wasteDisposal],
    ['Delivery/Stock', sellingTotals.deliveryStock, costTotals.deliveryStock],
    ['FENSA/Survey', sellingTotals.fensaSurvey, costTotals.fensaSurvey],
    ['Extras', sellingTotals.extras1 + sellingTotals.extras2 + sellingTotals.customExtra,
              costTotals.extras1 + costTotals.extras2 + costTotals.customExtra],
    ['Consumables', 0, Object.values(pricing.consumables).reduce((a, v) => a + v, 0) * totalQty],
    ['Overhead', 0, overhead],
  ];

  for (const [label, selling, cost] of breakdownCategories) {
    const s = selling as number;
    const c = cost as number;
    const margin = s > 0 ? ((s - c) / s * 100).toFixed(1) + '%' : '-';
    rows.push([label, '', s, c, margin]);
  }

  rows.push([]);

  const totalSelling = sellingTotals.total;
  const totalCost = costTotals.total + Object.values(pricing.consumables).reduce((a, v) => a + v, 0) * totalQty + overhead;
  const profit = totalSelling - totalCost;
  const margin = totalSelling > 0 ? ((profit / totalSelling) * 100).toFixed(1) + '%' : '0%';

  rows.push(['TOTAL SELLING', '', totalSelling]);
  rows.push(['TOTAL COST', '', totalCost]);
  rows.push(['PROFIT', '', profit]);
  rows.push(['MARGIN', '', margin]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 6 }, { wch: 16 }, { wch: 10 }, { wch: 10 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Quote Report');
  XLSX.writeFile(wb, `${project.projectRef || 'Quote'}-Report.xlsx`);
}
