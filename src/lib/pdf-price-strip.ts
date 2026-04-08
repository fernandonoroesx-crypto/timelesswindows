import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/* ── Company branding constants ─────────────────────────────── */
const COMPANY_NAME = 'Timeless Windows Ltd';
const COMPANY_ADDRESS = '2 New Kings Rd London SW6 4SA';
const LOGO_PATH = '/images/timeless-logo.png';

/* ── Types ──────────────────────────────────────────────────── */

interface TextFragment {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LineGroup {
  fragments: TextFragment[];
  text: string;
  minX: number;
  maxX: number;
  y: number;
  height: number;
}

/* ── Line grouping helpers ──────────────────────────────────── */

function groupIntoLines(items: TextFragment[], tolerance = 4): LineGroup[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: LineGroup[] = [];
  let currentLine: TextFragment[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    if (Math.abs(item.y - currentY) <= tolerance) {
      currentLine.push(item);
    } else {
      lines.push(buildLineGroup(currentLine));
      currentLine = [item];
      currentY = item.y;
    }
  }
  if (currentLine.length > 0) {
    lines.push(buildLineGroup(currentLine));
  }

  return lines;
}

function buildLineGroup(fragments: TextFragment[]): LineGroup {
  fragments.sort((a, b) => a.x - b.x);
  const text = fragments.map(f => f.str).join('');
  const minX = Math.min(...fragments.map(f => f.x));
  const maxX = Math.max(...fragments.map(f => f.x + f.width));
  const y = fragments[0].y;
  const height = Math.max(...fragments.map(f => f.height));
  return { fragments, text, minX, maxX, y, height };
}

/* ── Detection helpers ──────────────────────────────────────── */

function isPriceHeader(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === 'price, eur' ||
    t === 'total, eur' ||
    t === 'price,eur' ||
    t === 'total,eur' ||
    t === 'price, gbp' ||
    t === 'total, gbp' ||
    t === 'price' ||
    t === 'total' ||
    /^(price|total)\s*,\s*(eur|gbp|usd)$/i.test(t)
  );
}

function isCommentLine(text: string): boolean {
  const t = text.trim();
  return /^(comment|note|remark|kommentar|bemerkung|anmerkung)\s*[:：]/i.test(t);
}

function getDimensionRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const dimPatterns = [
    /\d+\s*[xX×]\s*\d+\s*(mm)?/g,
    /\d+\s*mm/gi,
    /\d+[.,]\d+\s*m²/g,
  ];
  for (const p of dimPatterns) {
    const re = new RegExp(p.source, p.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  return ranges;
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

function findPriceSpans(line: LineGroup): Array<{ startFrag: number; endFrag: number }> {
  const { text, fragments } = line;

  const pricePatterns = [
    /[£€]\s*[\d\s.,]+[\d]/g,
    /[\d\s.,]+[\d]\s*[£€]/g,
    /\d[\d\s.]*\d\s*[,.][-–—]/g,
    /\d{1,3}([,.]\d{3})*[,.]\d{2}(?!\s*mm)/g,
    /(?<!\d)\d{2,6}\s*[,.][-–—]\s*$/gm,
    /(?<!\d)\d{2,6}\s*[,.][-–—]/g,
  ];

  const dimRanges = getDimensionRanges(text);

  const spans: Array<{ start: number; end: number }> = [];

  for (const pattern of pricePatterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const matchStr = match[0].trim();
      if (matchStr.length < 2) continue;
      if (/^\d{1,4}\s*mm$/i.test(matchStr)) continue;
      spans.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  if (spans.length === 0) return [];

  spans.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [spans[0]];
  for (let i = 1; i < spans.length; i++) {
    const last = merged[merged.length - 1];
    if (spans[i].start <= last.end) {
      last.end = Math.max(last.end, spans[i].end);
    } else {
      merged.push(spans[i]);
    }
  }

  const result: Array<{ startFrag: number; endFrag: number }> = [];

  for (const span of merged) {
    let charPos = 0;
    let startFrag = -1;
    let endFrag = -1;

    for (let fi = 0; fi < fragments.length; fi++) {
      const fragStart = charPos;
      const fragEnd = charPos + fragments[fi].str.length;

      if (startFrag === -1 && fragEnd > span.start) {
        startFrag = fi;
      }
      if (fragEnd >= span.end) {
        endFrag = fi;
        break;
      }
      charPos = fragEnd;
    }

    if (startFrag === -1) startFrag = 0;
    if (endFrag === -1) endFrag = fragments.length - 1;

    result.push({ startFrag, endFrag });
  }

  return result;
}

/* ── Logo loader ────────────────────────────────────────────── */

async function loadLogoPng(): Promise<Uint8Array> {
  const resp = await fetch(LOGO_PATH);
  const buf = await resp.arrayBuffer();
  return new Uint8Array(buf);
}

/* ── Main export ────────────────────────────────────────────── */

/**
 * Strip prices from a supplier PDF, add company logo and footer.
 * Returns the cleaned PDF as a base64 data URI string.
 */
export async function stripPricesFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const copyForPdfJs = arrayBuffer.slice(0);
  const copyForPdfLib = arrayBuffer.slice(0);

  // 1. Use pdfjs-dist to find price text coordinates
  const pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(copyForPdfJs) }).promise;
  const priceRegions: Array<{ page: number; x: number; y: number; width: number; height: number }> = [];

  for (let i = 1; i <= pdfJs.numPages; i++) {
    const page = await pdfJs.getPage(i);
    const content = await page.getTextContent();

    const fragments: TextFragment[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const textItem = item as any;
      if (!textItem.str || textItem.str.trim().length === 0) continue;

      const tx = textItem.transform;
      fragments.push({
        str: textItem.str,
        x: tx[4],
        y: tx[5],
        width: textItem.width || textItem.str.length * 6,
        height: Math.abs(tx[3]) || textItem.height || 12,
      });
    }

    // Check individual fragments for price column headers
    for (const frag of fragments) {
      if (isPriceHeader(frag.str)) {
        const padding = 4;
        priceRegions.push({
          page: i - 1,
          x: frag.x - padding,
          y: frag.y - padding,
          width: frag.width + padding * 2,
          height: frag.height + padding * 2,
        });
      }
    }

    // Group into lines and find price spans
    const lines = groupIntoLines(fragments);

    for (const line of lines) {
      // Also check if the whole line is a price header
      if (isPriceHeader(line.text)) {
        const padding = 4;
        priceRegions.push({
          page: i - 1,
          x: line.minX - padding,
          y: line.y - padding,
          width: (line.maxX - line.minX) + padding * 2,
          height: line.height + padding * 2,
        });
        continue;
      }

      const spans = findPriceSpans(line);

      for (const span of spans) {
        const matchedFrags = line.fragments.slice(span.startFrag, span.endFrag + 1);
        if (matchedFrags.length === 0) continue;

        const minX = Math.min(...matchedFrags.map(f => f.x));
        const maxX = Math.max(...matchedFrags.map(f => f.x + f.width));
        const minY = Math.min(...matchedFrags.map(f => f.y));
        const maxHeight = Math.max(...matchedFrags.map(f => f.height));

        const padding = 4;
        priceRegions.push({
          page: i - 1,
          x: minX - padding,
          y: minY - padding,
          width: (maxX - minX) + padding * 2,
          height: maxHeight + padding * 2,
        });
      }
    }
  }

  // 2. Use pdf-lib to draw white rectangles + add branding
  const pdfDoc = await PDFDocument.load(copyForPdfLib);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Redact price regions
  for (const region of priceRegions) {
    if (region.page >= pages.length) continue;
    const page = pages[region.page];

    page.drawRectangle({
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      color: rgb(1, 1, 1),
    });
  }

  // 3. Add logo to page 1
  try {
    const logoBytes = await loadLogoPng();
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const firstPage = pages[0];
    const { width: pageW, height: pageH } = firstPage.getSize();

    const logoW = 170; // ~60mm
    const logoH = logoW * (logoImage.height / logoImage.width);
    const logoX = pageW - logoW - 30;
    const logoY = pageH - logoH - 20;

    firstPage.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    });
  } catch (err) {
    console.warn('Could not embed logo in cleaned PDF:', err);
  }

  // 4. Add footer to every page
  const totalPages = pages.length;
  const footerFontSize = 8;
  const footerY = 25;
  const lineY = 38;

  for (let pi = 0; pi < totalPages; pi++) {
    const page = pages[pi];
    const { width: pageW } = page.getSize();

    // Horizontal line
    page.drawLine({
      start: { x: 30, y: lineY },
      end: { x: pageW - 30, y: lineY },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

    // Left: company name + address
    const footerText = `${COMPANY_NAME}  |  ${COMPANY_ADDRESS}`;
    page.drawText(footerText, {
      x: 30,
      y: footerY,
      size: footerFontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Right: page number
    const pageNumText = `${pi + 1} of ${totalPages}`;
    const pageNumWidth = font.widthOfTextAtSize(pageNumText, footerFontSize);
    page.drawText(pageNumText, {
      x: pageW - 30 - pageNumWidth,
      y: footerY,
      size: footerFontSize,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const modifiedBytes = await pdfDoc.save();
  const base64 = uint8ArrayToBase64(modifiedBytes);
  return `data:application/pdf;base64,${base64}`;
}

/**
 * Convert a File to a base64 data URI string.
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
