import * as XLSX from 'xlsx';
import type { ExtractedLineItem, PdfExtractionResult } from './pdf-reader';

export async function extractExcelItems(file: File): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const pages: string[] = [];
  const allItems: ExtractedLineItem[] = [];

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

    // Find header row in first 20 rows
    let headerIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(20, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      const map = detectColumns(row);
      if (Object.keys(map).length >= 2) {
        headerIdx = r;
        colMap = map;
        break;
      }
    }

    console.log(`[Excel Reader] Sheet "${sheetName}": headerIdx=${headerIdx}, colMap=`, colMap);

    if (headerIdx === -1) {
      const fallbackItems = parseByPatternScan(rows, currency);
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

      let width = parseNum(widthRaw);
      let height = parseNum(heightRaw);

      // Try combined dimensions column
      if ((!width || !height) && colMap['dimensions'] !== undefined) {
        const parsed = parseDimensionString(String(row[colMap['dimensions']] || ''));
        if (parsed) { width = parsed.w; height = parsed.h; }
      }

      // Scan all text cells for embedded dimensions if still missing
      if (!width || !height) {
        for (let c = 0; c < row.length; c++) {
          if (typeof row[c] === 'string') {
            const parsed = parseDimensionString(row[c]);
            if (parsed) { width = parsed.w; height = parsed.h; break; }
          }
        }
      }

      if (!width || width < 100 || !height || height < 100) continue;

      const price = parseNum(priceRaw) || 0;
      const qty = parseNum(qtyRaw) || 1;
      const type = detectType(String(typeRaw || '') + ' ' + rowText(row));
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

  console.log(`[Excel Reader] Total items extracted: ${allItems.length}`);
  const rawText = pages.join('\n\n');
  return { rawText, pages, items: allItems };
}

function detectColumns(headerRow: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let c = 0; c < headerRow.length; c++) {
    const h = String(headerRow[c] || '').toLowerCase().replace(/[()]/g, ' ').trim();
    if (!h) continue;

    // Ref / item ref
    if (!map['ref'] && /\b(ref|item\s*ref|reference|code|mark|pos|no\.|item\s*no)\b/i.test(h)) {
      map['ref'] = c;
    }
    // Type
    else if (!map['type'] && /\b(type|product|window|door|description|desc)\b/i.test(h)) {
      map['type'] = c;
    }
    // Qty
    else if (!map['qty'] && /\b(qty|quantity|pcs|pieces|nr|pce|no\s*of)\b/i.test(h)) {
      map['qty'] = c;
    }
    // Width (explicit)
    else if (!map['width'] && /\b(width|w)\b/i.test(h) && !/total/i.test(h)) {
      map['width'] = c;
    }
    // Height (explicit)
    else if (!map['height'] && /\b(height|h)\b/i.test(h) && !/total/i.test(h)) {
      map['height'] = c;
    }
    // Combined dimensions
    else if (!map['dimensions'] && /\b(dim|dimensions?|size)\b/i.test(h)) {
      map['dimensions'] = c;
    }
    // Price
    else if (!map['price'] && /\b(price|cost|net|sell|unit\s*price|each|amount|unit\s*total|material)\b|[£€]/i.test(h) && !/grand/i.test(h)) {
      map['price'] = c;
    }
  }
  return map;
}

const DIM_REGEX = /(\d{3,4})\s*[x×X]\s*(\d{3,4})/;
const DIM_WH_REGEX = /[wW]\s*[:=]?\s*(\d{3,4})\s*[,\s]*[hH]\s*[:=]?\s*(\d{3,4})/;
const DIM_WH2_REGEX = /(\d{3,4})\s*[wW]\s*[x×X\s]\s*(\d{3,4})\s*[hH]/;

function parseDimensionString(s: string): { w: number; h: number } | null {
  let m = s.match(DIM_REGEX);
  if (m) return { w: parseInt(m[1]), h: parseInt(m[2]) };
  m = s.match(DIM_WH_REGEX);
  if (m) return { w: parseInt(m[1]), h: parseInt(m[2]) };
  m = s.match(DIM_WH2_REGEX);
  if (m) return { w: parseInt(m[1]), h: parseInt(m[2]) };
  return null;
}

function rowText(row: any[]): string {
  return row.map(c => String(c || '')).join(' ');
}

function parseByPatternScan(rows: any[][], currency: 'GBP' | 'EUR'): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];
  for (const row of rows) {
    if (!row) continue;
    const text = rowText(row);

    // Try dimension patterns in text cells
    const dim = parseDimensionString(text);
    if (dim && dim.w >= 100 && dim.h >= 100) {
      const priceNums = row.filter((c: any) => typeof c === 'number' && c > 0 && c < 50000);
      const type = detectType(text);
      const refCell = row.find((c: any) => typeof c === 'string' && /^[A-Z0-9\-\/]{2,10}$/i.test(c.trim()));
      items.push({
        itemRef: refCell ? String(refCell).trim() : '',
        type,
        qty: 1,
        widthMm: dim.w,
        heightMm: dim.h,
        manufacturePrice: priceNums.length > 0 ? priceNums[priceNums.length - 1] : 0,
        currency,
        supplier: '',
      });
      continue;
    }

    // Fallback: two numbers in dimension range
    const nums = row.filter((c: any) => typeof c === 'number' && c >= 100 && c <= 4000);
    if (nums.length >= 2) {
      const priceNums = row.filter((c: any) => typeof c === 'number' && c > 0 && c < 50000 && !nums.includes(c));
      items.push({
        itemRef: '',
        type: detectType(text),
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
  if (/fix\w*\s*sash/i.test(lower)) return 'Fix Sash';
  if (/fixed/i.test(lower)) return 'Fix Sash';
  if (lower.includes('casement') && lower.includes('flag')) return 'Casement Flag';
  if (lower.includes('casement')) return 'Casement';
  return 'Casement';
}
