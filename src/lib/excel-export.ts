import ExcelJS from 'exceljs';
import type { Project } from './types';
import { getItemSellingBreakdown, getItemCostBreakdown } from './pricing';
import { getProjectPricing } from './context';

const DARK_BLUE = 'FF2B3A67';
const LIGHT_GREY = 'FFF2F2F2';
const GREEN_FILL = 'FF27AE60';
const RED_FILL = 'FFE74C3C';
const WHITE = 'FFFFFFFF';
const BORDER_COLOR = 'FFD0D0D0';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

const currencyFmt = '£#,##0.00';

export async function exportQuoteExcel(project: Project) {
  const pricing = project.pricing || getProjectPricing(project);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Quote Report');

  // --- Project header ---
  ws.mergeCells('A1:U1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${project.projectRef || 'Quote'} — ${project.client || 'Client'}`;
  titleCell.font = { bold: true, size: 14, color: { argb: DARK_BLUE } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:U2');
  ws.getCell('A2').value = `Date: ${project.date || '—'}`;
  ws.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
  ws.getRow(2).height = 18;

  // --- Column headers (row 4) ---
  const headers = [
    'Proj Ref', 'Item Ref', 'Qty', 'Type', 'Width (mm)', 'Height (mm)',
    'Material', 'Installation', 'Int. Making Good', 'Ext. Making Good',
    'Architrave', 'Trims', 'MDF Reveal', 'Waste Disposal',
    'Delivery/Stock', 'FENSA/Survey', 'Extra1', 'Extra2', 'Custom Extra',
    'Unit Total', 'Total'
  ];

  const headerRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 24;

  // --- Column widths ---
  const widths = [14, 12, 6, 16, 10, 10, 12, 12, 14, 14, 12, 10, 12, 12, 12, 12, 10, 10, 12, 12, 12];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Currency columns (7-21)
  const currCols = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  // --- Data rows ---
  const sellingTotals: Record<string, number> = {
    material: 0, installation: 0, internalMakingGood: 0, externalMakingGood: 0,
    architrave: 0, trims: 0, mdfReveal: 0, wasteDisposal: 0,
    deliveryStock: 0, fensaSurvey: 0, extras1: 0, extras2: 0, customExtra: 0,
    unitTotal: 0, total: 0,
  };
  const costTotals = { ...sellingTotals };

  let rowNum = 5;
  for (const item of project.lineItems) {
    const sb = getItemSellingBreakdown(item, project.settings, pricing);
    const cb = getItemCostBreakdown(item, project.settings, pricing);
    const extra1Val = item.extra1 !== 'none' ? (pricing.extras[item.extra1] || 0) : 0;
    const extra2Val = item.extra2 !== 'none' ? (pricing.extras[item.extra2] || 0) : 0;

    const values = [
      project.projectRef, item.itemRef, item.qty, item.type, item.widthMm, item.heightMm,
      sb.material, sb.installation, sb.internalMakingGood, sb.externalMakingGood,
      sb.architrave, sb.trims, sb.mdfReveal, sb.wasteDisposal,
      sb.deliveryStock, sb.fensaSurvey, extra1Val, extra2Val,
      item.customExtra || 0, sb.unitTotal, sb.total,
    ];

    const row = ws.getRow(rowNum);
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (currCols.includes(i + 1)) cell.numFmt = currencyFmt;
    });

    // Alternate row shading
    if ((rowNum - 5) % 2 === 1) {
      values.forEach((_, i) => {
        row.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREY } };
      });
    }

    // Accumulate totals
    const keys = ['material', 'installation', 'internalMakingGood', 'externalMakingGood',
      'architrave', 'trims', 'mdfReveal', 'wasteDisposal', 'deliveryStock', 'fensaSurvey'];
    keys.forEach(k => {
      sellingTotals[k] += (sb as any)[k] * item.qty;
      costTotals[k] += (cb as any)[k] * item.qty;
    });
    sellingTotals.extras1 += extra1Val * item.qty;
    sellingTotals.extras2 += extra2Val * item.qty;
    sellingTotals.customExtra += (item.customExtra || 0) * item.qty;
    sellingTotals.unitTotal += sb.unitTotal * item.qty;
    sellingTotals.total += sb.total;
    costTotals.extras1 += extra1Val * item.qty;
    costTotals.extras2 += extra2Val * item.qty;
    costTotals.customExtra += (item.customExtra || 0) * item.qty;
    costTotals.unitTotal += cb.unitTotal * item.qty;
    costTotals.total += cb.total;

    rowNum++;
  }

  // --- Totals row ---
  const totalQty = project.lineItems.reduce((s, i) => s + i.qty, 0);
  const totalsValues = [
    '', 'TOTALS', totalQty, '', '', '',
    sellingTotals.material, sellingTotals.installation,
    sellingTotals.internalMakingGood, sellingTotals.externalMakingGood,
    sellingTotals.architrave, sellingTotals.trims, sellingTotals.mdfReveal,
    sellingTotals.wasteDisposal, sellingTotals.deliveryStock, sellingTotals.fensaSurvey,
    sellingTotals.extras1, sellingTotals.extras2, sellingTotals.customExtra,
    sellingTotals.unitTotal, sellingTotals.total,
  ];

  const totalsRow = ws.getRow(rowNum);
  totalsValues.forEach((v, i) => {
    const cell = totalsRow.getCell(i + 1);
    cell.value = v;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREY } };
    cell.border = {
      top: { style: 'medium', color: { argb: DARK_BLUE } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (currCols.includes(i + 1)) cell.numFmt = currencyFmt;
  });
  rowNum += 2;

  // --- Breakdown section ---
  const breakdownHeaderRow = ws.getRow(rowNum);
  ws.mergeCells(`A${rowNum}:E${rowNum}`);
  breakdownHeaderRow.getCell(1).value = 'BREAKDOWN';
  breakdownHeaderRow.getCell(1).font = { bold: true, size: 11, color: { argb: WHITE } };
  breakdownHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
  ['', '', 'Selling', 'Cost', 'Margin'].forEach((h, i) => {
    if (i < 2) return;
    const cell = breakdownHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
    cell.alignment = { horizontal: 'center' };
  });
  // Fill remaining cells in header
  for (let c = 1; c <= 5; c++) {
    breakdownHeaderRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
    breakdownHeaderRow.getCell(c).font = breakdownHeaderRow.getCell(c).font || { bold: true, color: { argb: WHITE } };
  }
  rowNum++;

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
    ['Consumables', 0, Object.values(pricing.consumables).reduce((a: number, v: any) => a + Number(v), 0) * totalQty],
    ['Overhead', 0, overhead],
  ];

  breakdownCategories.forEach(([label, selling, cost], idx) => {
    const s = selling as number;
    const c = cost as number;
    const margin = s > 0 ? ((s - c) / s * 100).toFixed(1) + '%' : '—';
    const row = ws.getRow(rowNum);
    row.getCell(1).value = label as string;
    row.getCell(1).font = { size: 10 };
    row.getCell(3).value = s;
    row.getCell(3).numFmt = currencyFmt;
    row.getCell(4).value = c;
    row.getCell(4).numFmt = currencyFmt;
    row.getCell(5).value = margin;
    row.getCell(5).alignment = { horizontal: 'center' };
    for (let col = 1; col <= 5; col++) {
      row.getCell(col).border = thinBorder;
      if (idx % 2 === 1) {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREY } };
      }
    }
    rowNum++;
  });

  rowNum++;

  // --- Summary ---
  const totalSelling = sellingTotals.total;
  const totalCost = costTotals.total + Object.values(pricing.consumables).reduce((a: number, v: any) => a + Number(v), 0) * totalQty + overhead;
  const profit = totalSelling - totalCost;
  const margin = totalSelling > 0 ? ((profit / totalSelling) * 100).toFixed(1) + '%' : '0%';

  const summaryItems: [string, number | string, string][] = [
    ['TOTAL SELLING', totalSelling, currencyFmt],
    ['TOTAL COST', totalCost, currencyFmt],
    ['PROFIT', profit, currencyFmt],
    ['MARGIN', margin, ''],
  ];

  summaryItems.forEach(([label, value, fmt], idx) => {
    const row = ws.getRow(rowNum);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, size: 11 };
    row.getCell(3).value = value;
    if (fmt) row.getCell(3).numFmt = fmt;
    row.getCell(3).font = { bold: true, size: 11 };
    row.getCell(3).alignment = { horizontal: 'center' };

    // Color profit/margin
    if (idx === 2) {
      const fillColor = (value as number) >= 0 ? GREEN_FILL : RED_FILL;
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        row.getCell(c).font = { bold: true, size: 11, color: { argb: WHITE } };
      }
    }
    if (idx === 3) {
      for (let c = 1; c <= 5; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
        row.getCell(c).font = { bold: true, size: 11, color: { argb: WHITE } };
      }
    }

    for (let c = 1; c <= 5; c++) {
      row.getCell(c).border = thinBorder;
    }
    rowNum++;
  });

  // --- Download ---
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.projectRef || 'Quote'}-Report.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
