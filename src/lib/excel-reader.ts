import * as XLSX from 'xlsx';
import type { ExtractedLineItem, PdfExtractionResult } from './pdf-reader';

export async function extractExcelItems(file: File): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const pages: string[] = [];
  const allItems: ExtractedLineItem[] = [];

  // Detect currency from entire workbook text
  const fullText = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    return XLSX.utils.sheet_to_csv(sheet);
  }).join('\n');
  const hasEuro = /€|EUR/i.test(fullText);
  const currency: 'GBP' | 'EUR' = hasEuro ? 'EUR' : 'GBP';

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    pages.push(`--- ${sheetName} ---\n${csv}`);

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length < 2) continue;

    // Find header row (first row with multiple text cells)
    let headerIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      const map = detectColumns(row);
      if (Object.keys(map).length >= 2) {
        headerIdx = r;
        colMap = map;
        break;
      }
    }

    if (headerIdx === -1) {
      // Fallback: scan for numeric patterns
      const fallbackItems = parseByNumericPatterns(rows, currency);
      allItems.push(...fallbackItems);
      continue;
    }

    // Parse data rows
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.every((c: any) => c === undefined || c === '')) continue;

      const get = (key: string): any => colMap[key] !== undefined ? row[colMap[key]] : undefined;

      const widthRaw = get('width');
      const heightRaw = get('height');
      const priceRaw = get('price');
      const qtyRaw = get('qty');
      const typeRaw = get('type');
      const refRaw = get('ref');

      // Try dimension from a combined "dimensions" column (e.g. "630x1670")
      let width = parseNum(widthRaw);
      let height = parseNum(heightRaw);

      if ((!width || !height) && colMap['dimensions'] !== undefined) {
        const dimStr = String(row[colMap['dimensions']] || '');
        const dimMatch = dimStr.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
        if (dimMatch) {
          width = parseInt(dimMatch[1]);
          height = parseInt(dimMatch[2]);
        }
      }

      if (!width || width < 200 || !height || height < 200) continue;

      const price = parseNum(priceRaw) || 0;
      const qty = parseNum(qtyRaw) || 1;
      const type = detectType(String(typeRaw || ''));
      const ref = String(refRaw || '').trim();

      allItems.push({
        itemRef: ref,
        type,
        qty: qty > 0 && qty < 999 ? qty : 1,
        widthMm: width,
        heightMm: height,
        manufacturePrice: price,
        currency,
        supplier: '',
      });
    }
  }

  const rawText = pages.join('\n\n');
  return { rawText, pages, items: allItems };
}

function detectColumns(headerRow: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let c = 0; c < headerRow.length; c++) {
    const h = String(headerRow[c] || '').toLowerCase().trim();
    if (!h) continue;
    if (/ref|item\s*ref|reference|code/i.test(h)) map['ref'] = c;
    else if (/^type$|product|window|door/i.test(h)) map['type'] = c;
    else if (/qty|quantity|pcs|pieces/i.test(h)) map['qty'] = c;
    else if (/width/i.test(h)) map['width'] = c;
    else if (/height/i.test(h)) map['height'] = c;
    else if (/dim/i.test(h)) map['dimensions'] = c;
    else if (/price|cost|amount|total|£|€/i.test(h)) map['price'] = c;
  }
  return map;
}

function parseByNumericPatterns(rows: any[][], currency: 'GBP' | 'EUR'): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];
  for (const row of rows) {
    if (!row) continue;
    const nums = row.filter((c: any) => typeof c === 'number' && c >= 200 && c <= 3000);
    if (nums.length >= 2) {
      const priceNums = row.filter((c: any) => typeof c === 'number' && c > 0 && c < 200);
      items.push({
        itemRef: '',
        type: 'Casement',
        qty: 1,
        widthMm: nums[0],
        heightMm: nums[1],
        manufacturePrice: priceNums.length > 0 ? priceNums[priceNums.length - 1] : 0,
        currency,
        supplier: '',
      });
    }
  }
  return items;
}

function parseNum(val: any): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[£€,\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function detectType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('patio door')) return 'Patio Door';
  if (lower.includes('french door')) return 'French Door';
  if (lower.includes('door') && lower.includes('top light')) return 'Door + Top Light';
  if (lower.includes('door')) return 'Door';
  if (lower.includes('box sash')) return 'Box Sash';
  if (lower.includes('spring sash')) return 'Spring Sash';
  if (lower.includes('fix') && lower.includes('sash')) return 'Fix Sash';
  if (lower.includes('casement') && lower.includes('flag')) return 'Casement Flag';
  if (lower.includes('casement')) return 'Casement';
  return 'Casement';
}
