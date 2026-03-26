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
  const items = parseLineItems(rawText);

  return { rawText, pages, items };
}

function parseLineItems(text: string): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];

  // Try to detect currency
  const hasEuro = /€|EUR/i.test(text);
  const currency: 'GBP' | 'EUR' = hasEuro ? 'EUR' : 'GBP';

  // Pattern: look for dimension patterns like "600 x 900" or "600×900" or "600x900"
  // along with prices and quantities
  const lines = text.split(/\n/);

  for (const line of lines) {
    // Try to find dimensions pattern (width x height in mm)
    const dimMatch = line.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
    if (!dimMatch) continue;

    const widthMm = parseInt(dimMatch[1]);
    const heightMm = parseInt(dimMatch[2]);

    // Try to find price
    const priceMatch = line.match(/[£€]?\s*(\d+[,.]?\d*\.?\d{0,2})\s*(?:each|per|unit|ea)?/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : 0;

    // Try to find quantity
    const qtyMatch = line.match(/(?:qty|quantity|x)\s*(\d+)/i) || line.match(/^(\d+)\s+/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    // Try to detect window type
    const type = detectWindowType(line);

    // Try to find a reference
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

  // If no items found with dimensions, try a more aggressive table-based parsing
  if (items.length === 0) {
    const tableItems = parseTableFormat(text, currency);
    items.push(...tableItems);
  }

  return items;
}

function parseTableFormat(text: string, currency: 'GBP' | 'EUR'): ExtractedLineItem[] {
  const items: ExtractedLineItem[] = [];

  // Split into potential rows and look for numeric patterns
  // Many supplier PDFs have: ref, description, qty, width, height, price
  const numberGroups = text.match(/(\d{3,4})\s+(\d{3,4})\s+.*?(\d+\.?\d{0,2})/g);

  if (numberGroups) {
    for (const group of numberGroups) {
      const nums = group.match(/\d+\.?\d*/g);
      if (nums && nums.length >= 3) {
        const n1 = parseInt(nums[0]);
        const n2 = parseInt(nums[1]);
        const price = parseFloat(nums[nums.length - 1]);

        // Heuristic: dimensions are 200-3000mm range
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
  return 'Casement'; // default
}
