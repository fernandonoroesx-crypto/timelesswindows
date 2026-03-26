import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface ExtractedLineItem {
  itemRef: string;
  type: string;
  qty: number;
  widthMm: number;
  heightMm: number;
  manufacturePrice: number;
  currency: 'GBP' | 'EUR';
  supplier: string;
}

export interface PdfExtractionResult {
  rawText: string;
  pages: string[];
  items: ExtractedLineItem[];
}

export async function extractPdfText(file: File): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => item.str);
    pages.push(strings.join(' '));
  }

  const rawText = pages.join('\n\n--- PAGE BREAK ---\n\n');
  const items = parseAllItems(rawText, pages);

  return { rawText, pages, items };
}

function parseAllItems(rawText: string, pages: string[]): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];

  // Detect currency from entire text
  const hasEuro = /€|EUR/i.test(rawText);
  const currency: 'GBP' | 'EUR' = hasEuro ? 'EUR' : 'GBP';

  // Strategy 1: Parse supplier format (e.g., Timeless Windows)
  // Pattern: dimensions like "630x1670mm" followed by area and price like "587,-"
  const supplierItems = parseSupplierFormat(rawText, currency);
  if (supplierItems.length > 0) {
    items.push(...supplierItems);
    return items;
  }

  // Strategy 2: Generic dimension-based parsing
  const genericItems = parseGenericFormat(rawText, currency);
  items.push(...genericItems);

  // Strategy 3: Table-based fallback
  if (items.length === 0) {
    const tableItems = parseTableFormat(rawText, currency);
    items.push(...tableItems);
  }

  return items;
}

/**
 * Parse supplier PDFs like Timeless Windows format:
 * - Each item/page has a "Type:" line describing the product
 * - Dimensions appear as "WIDTHxHEIGHTmm" (e.g., "630x1670mm")
 * - Prices appear as "NUMBER,-" (e.g., "587,-" or "1223,-")
 * - Item refs like "W10", "W11" may appear as headers
 */
function parseSupplierFormat(text: string, currency: 'GBP' | 'EUR'): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];

  // Find all dimension+price combos: "630x1670mm 1.05m² 587,-" or "630x1670mm  0.84m²  457,-"
  // Also handle table rows where dimensions and price are on the same line
  // Handle various text rendering: m², m2, m 2, m ², and different dash chars (-, –, —)
  const dimPricePattern = /(\d{3,4})\s*x\s*(\d{3,4})\s*mm\s+[\d.]+\s*m[²2\s]\s*(\d+)[,.\s]*[-–—]/g;
  let match;

  while ((match = dimPricePattern.exec(text)) !== null) {
    const widthMm = parseInt(match[1]);
    const heightMm = parseInt(match[2]);
    const price = parseInt(match[3]);

    // Look backwards in text for Type info and item ref
    const preceding = text.substring(Math.max(0, match.index - 2000), match.index);
    const type = detectWindowTypeFromContext(preceding);
    const itemRef = detectItemRef(preceding);

    // Look for quantity near the price - check for "Quantity" column or qty pattern
    const surrounding = text.substring(match.index, Math.min(text.length, match.index + 100));
    const qtyMatch = surrounding.match(/(\d+)\s+(\d+)[,.][-–]/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    items.push({
      itemRef,
      type,
      qty: qty > 0 && qty < 999 ? qty : 1,
      widthMm,
      heightMm,
      manufacturePrice: price,
      currency,
      supplier: '',
    });
  }

  // Also try: separate dimension pattern "WIDTHxHEIGHTmm" and standalone price "587,-"
  // For pages where dimensions and price are in separate table cells
  if (items.length === 0) {
    const dimOnlyPattern = /(\d{3,4})\s*x\s*(\d{3,4})\s*mm/g;
    const pricePattern = /\b(\d{3,5})[,.\s]*[-–—]/g;

    const dims: Array<{ w: number; h: number; index: number }> = [];
    const prices: Array<{ price: number; index: number }> = [];

    let m;
    while ((m = dimOnlyPattern.exec(text)) !== null) {
      dims.push({ w: parseInt(m[1]), h: parseInt(m[2]), index: m.index });
    }
    while ((m = pricePattern.exec(text)) !== null) {
      // Filter out dimensions being picked up as prices
      const val = parseInt(m[1]);
      if (val >= 50 && val <= 50000) {
        prices.push({ price: val, index: m.index });
      }
    }

    // Match each dimension with its nearest following price
    for (const dim of dims) {
      // Skip windowboard dimensions (usually mentioned in spec text with "70x" prefix)
      const contextBefore = text.substring(Math.max(0, dim.index - 100), dim.index);
      if (/windowboard|window\s*board|thick/i.test(contextBefore)) continue;
      // Skip very small dimensions that are likely hardware specs
      if (dim.w < 200 || dim.h < 200) continue;

      const nearestPrice = prices.find(p => p.index > dim.index && p.index - dim.index < 500);
      if (!nearestPrice) continue;

      const preceding = text.substring(Math.max(0, dim.index - 2000), dim.index);
      const type = detectWindowTypeFromContext(preceding);
      const itemRef = detectItemRef(preceding);

      items.push({
        itemRef,
        type,
        qty: 1,
        widthMm: dim.w,
        heightMm: dim.h,
        manufacturePrice: nearestPrice.price,
        currency,
        supplier: '',
      });

      // Remove used price so it's not reused
      const idx = prices.indexOf(nearestPrice);
      if (idx > -1) prices.splice(idx, 1);
    }
  }

  return items;
}

function detectItemRef(text: string): string {
  // Look for patterns like "W10 (1pcs)", "W11", "D1", etc. - take the LAST one found
  const refs = [...text.matchAll(/\b([WD]\d{1,3})\b/g)];
  if (refs.length > 0) return refs[refs.length - 1][1];

  // Also try "AXI154" style refs
  const orderRefs = [...text.matchAll(/\b([A-Z]{2,4}\d{2,})\b/g)];
  if (orderRefs.length > 0) return orderRefs[orderRefs.length - 1][1];

  return '';
}

function detectWindowTypeFromContext(text: string): string {
  // Find the LAST "Type:" mention and extract its description
  const typeMatches = [...text.matchAll(/Type:\s*(.+?)(?:\n|$)/gi)];
  if (typeMatches.length > 0) {
    const typeDesc = typeMatches[typeMatches.length - 1][1].toLowerCase();
    if (typeDesc.includes('door') && typeDesc.includes('french')) return 'French Door';
    if (typeDesc.includes('door') && typeDesc.includes('patio')) return 'Patio Door';
    if (typeDesc.includes('door')) return 'Door';
    if (typeDesc.includes('box') && typeDesc.includes('sash')) return 'Box Sash';
    if (typeDesc.includes('spring') && typeDesc.includes('sash')) return 'Spring Sash';
    if (typeDesc.includes('fix') && typeDesc.includes('sash')) return 'Fix Sash';
    if (typeDesc.includes('casement') && typeDesc.includes('flag')) return 'Casement Flag';
    if (typeDesc.includes('casement')) return 'Casement';
    if (typeDesc.includes('sash')) return 'Box Sash';
  }
  return 'Casement';
}

function parseGenericFormat(text: string, currency: 'GBP' | 'EUR'): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];
  const lines = text.split(/\n/);

  for (const line of lines) {
    const dimMatch = line.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
    if (!dimMatch) continue;

    const widthMm = parseInt(dimMatch[1]);
    const heightMm = parseInt(dimMatch[2]);
    if (widthMm < 200 || heightMm < 200) continue;

    const priceMatch = line.match(/[£€]?\s*(\d+[,.]?\d*\.?\d{0,2})\s*(?:each|per|unit|ea)?/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

    const qtyMatch = line.match(/(?:qty|quantity|x)\s*(\d+)/i) || line.match(/^(\d+)\s+/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    const type = detectWindowType(line);
    const refMatch = line.match(/([A-Z]{2,4}[-_]\d{2,})/i);
    const itemRef = refMatch ? refMatch[1] : '';

    items.push({
      itemRef,
      type,
      qty: qty > 0 && qty < 999 ? qty : 1,
      widthMm,
      heightMm,
      manufacturePrice: price,
      currency,
      supplier: '',
    });
  }

  return items;
}

function parseTableFormat(text: string, currency: 'GBP' | 'EUR'): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];
  const numberGroups = text.match(/(\d{3,4})\s+(\d{3,4})\s+.*?(\d+\.?\d{0,2})/g);

  if (numberGroups) {
    for (const group of numberGroups) {
      const nums = group.match(/\d+\.?\d*/g);
      if (nums && nums.length >= 3) {
        const n1 = parseInt(nums[0]);
        const n2 = parseInt(nums[1]);
        const price = parseFloat(nums[nums.length - 1]);

        if (n1 >= 200 && n1 <= 3000 && n2 >= 200 && n2 <= 3000) {
          items.push({
            itemRef: '',
            type: 'Casement',
            qty: 1,
            widthMm: n1,
            heightMm: n2,
            manufacturePrice: price,
            currency,
            supplier: '',
          });
        }
      }
    }
  }

  return items;
}

function detectWindowType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('patio door')) return 'Patio Door';
  if (lower.includes('french door')) return 'French Door';
  if (lower.includes('door') && lower.includes('top light')) return 'Door + Top Light';
  if (lower.includes('door')) return 'Door';
  if (lower.includes('box sash')) return 'Box Sash';
  if (lower.includes('spring sash')) return 'Spring Sash';
  if (lower.includes('fix sash') || lower.includes('fixed sash')) return 'Fix Sash';
  if (lower.includes('casement flag')) return 'Casement Flag';
  if (lower.includes('casement')) return 'Casement';
  return 'Casement';
}
