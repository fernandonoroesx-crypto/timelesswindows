import ExcelJS from 'exceljs';
import type { Project } from './types';
import { getItemSellingBreakdown } from './pricing';
import { getProjectPricing } from './context';

const DARK_CHARCOAL = 'FF2D2D2D';
const LIGHT_GREY = 'FFF2F2F2';
const WHITE = 'FFFFFFFF';
const BORDER_COLOR = 'FFD0D0D0';

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  left: { style: 'thin', color: { argb: BORDER_COLOR } },
  right: { style: 'thin', color: { argb: BORDER_COLOR } },
};

const currencyFmt = '£#,##0.00';

async function loadLogoForExcel(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch('/images/timeless-logo.png');
    const blob = await response.blob();
    return blob.arrayBuffer();
  } catch {
    return null;
  }
}

export async function exportQuoteExcel(project: Project) {
  const pricing = project.pricing || getProjectPricing(project);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Quote Report');

  // --- Logo (top-right) ---
  const logoBuffer = await loadLogoForExcel();
  if (logoBuffer) {
    const logoId = wb.addImage({ buffer: logoBuffer, extension: 'png' });
    ws.addImage(logoId, {
      tl: { col: 8, row: 0 },
      ext: { width: 280, height: 76 },
    });
  }

  // --- Project header ---
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `${project.projectRef || 'Quote'} — ${project.client || 'Client'}`;
  titleCell.font = { bold: true, size: 14, color: { argb: DARK_CHARCOAL } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:H2');
  ws.getCell('A2').value = `Date: ${project.date || '—'}`;
  ws.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } };
  ws.getRow(2).height = 18;

  // --- Column headers (row 4) ---
  const headers = [
    'Proj Ref', 'Item Ref', 'Qty', 'Type', 'Width (mm)', 'Height (mm)',
    'Material', 'Labour', 'Waste Disposal', 'Extras',
    'Unit Total', 'Total'
  ];

  const headerRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_CHARCOAL } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });
  headerRow.height = 24;

  const widths = [14, 12, 6, 16, 10, 10, 12, 12, 14, 12, 12, 12];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // Columns that get currency formatting (1-indexed): Material(7), Labour(8), Waste(9), Extras(10), UnitTotal(11), Total(12)
  const currCols = [7, 8, 9, 10, 11, 12];

  const sellingTotals = {
    material: 0, labour: 0, wasteDisposal: 0, extras: 0,
    unitTotal: 0, total: 0,
  };

  let rowNum = 5;
  for (const item of project.lineItems) {
    const sb = getItemSellingBreakdown(item, project.settings, pricing);
    const extra1Val = item.extra1 !== 'none' ? (pricing.extrasSelling[item.extra1] || 0) : 0;
    const extra2Val = item.extra2 !== 'none' ? (pricing.extrasSelling[item.extra2] || 0) : 0;

    const labour = sb.installation + sb.internalMakingGood + sb.externalMakingGood
      + sb.architrave + sb.trims + sb.mdfReveal;
    const extras = extra1Val + extra2Val + (item.customExtra || 0);

    const values = [
      project.projectRef, item.itemRef, item.qty, item.type, item.widthMm, item.heightMm,
      sb.material, labour, sb.wasteDisposal, extras,
      sb.unitTotal, sb.total,
    ];

    const row = ws.getRow(rowNum);
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.border = thinBorder;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (currCols.includes(i + 1)) cell.numFmt = currencyFmt;
    });

    if ((rowNum - 5) % 2 === 1) {
      values.forEach((_, i) => {
        row.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREY } };
      });
    }

    sellingTotals.material += sb.material * item.qty;
    sellingTotals.labour += labour * item.qty;
    sellingTotals.wasteDisposal += sb.wasteDisposal * item.qty;
    sellingTotals.extras += extras * item.qty;
    sellingTotals.unitTotal += sb.unitTotal * item.qty;
    sellingTotals.total += sb.total;

    rowNum++;
  }

  // --- Totals row ---
  const totalQty = project.lineItems.reduce((s, i) => s + i.qty, 0);
  const totalsValues = [
    '', 'TOTALS', totalQty, '', '', '',
    sellingTotals.material, sellingTotals.labour,
    sellingTotals.wasteDisposal, sellingTotals.extras,
    sellingTotals.unitTotal, sellingTotals.total,
  ];

  const totalsRow = ws.getRow(rowNum);
  totalsValues.forEach((v, i) => {
    const cell = totalsRow.getCell(i + 1);
    cell.value = v;
    cell.font = { bold: true, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREY } };
    cell.border = {
      top: { style: 'medium', color: { argb: DARK_CHARCOAL } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (currCols.includes(i + 1)) cell.numFmt = currencyFmt;
  });
  rowNum += 2;

  // --- Summary breakdown ---
  const summaryHeaderRow = ws.getRow(rowNum);
  ws.mergeCells(`A${rowNum}:C${rowNum}`);
  ['SUMMARY', '', '', 'Amount'].forEach((h, i) => {
    const cell = summaryHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_CHARCOAL } };
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center' };
    cell.border = thinBorder;
  });
  rowNum++;

  const summaryCategories: [string, number][] = [
    ['Materials', sellingTotals.material],
    ['Labour', sellingTotals.labour],
    ['Waste Disposal', sellingTotals.wasteDisposal],
    ['Extras', sellingTotals.extras],
  ];

  summaryCategories.forEach(([label, amount], idx) => {
    const row = ws.getRow(rowNum);
    row.getCell(1).value = label;
    row.getCell(1).font = { size: 10 };
    row.getCell(4).value = amount;
    row.getCell(4).numFmt = currencyFmt;
    row.getCell(4).alignment = { horizontal: 'center' };
    for (let c = 1; c <= 4; c++) {
      row.getCell(c).border = thinBorder;
      if (idx % 2 === 1) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GREY } };
      }
    }
    rowNum++;
  });

  rowNum++;

  // --- Grand total ---
  const grandTotalRow = ws.getRow(rowNum);
  grandTotalRow.getCell(1).value = 'TOTAL (excl. VAT)';
  grandTotalRow.getCell(1).font = { bold: true, size: 12 };
  grandTotalRow.getCell(4).value = sellingTotals.total;
  grandTotalRow.getCell(4).numFmt = currencyFmt;
  grandTotalRow.getCell(4).font = { bold: true, size: 12 };
  grandTotalRow.getCell(4).alignment = { horizontal: 'center' };
  for (let c = 1; c <= 4; c++) {
    grandTotalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_CHARCOAL } };
    grandTotalRow.getCell(c).font = { bold: true, size: 12, color: { argb: WHITE } };
    grandTotalRow.getCell(c).border = thinBorder;
  }

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
