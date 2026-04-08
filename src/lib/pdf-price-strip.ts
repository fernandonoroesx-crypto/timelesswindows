import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { loadLogoAsUint8Array } from './logo';

/* ── Company branding constants ─────────────────────────────── */
const COMPANY_NAME = 'Timeless Windows Ltd';
const COMPANY_ADDRESS = '2 New Kings Rd London SW6 4SA';

/* ── Types ──────────────────────────────────────────────────── */

interface TextFragment {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RedactRegion {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ColumnRange {
  minX: number;
  maxX: number;
}

/* ── Detection helpers ──────────────────────────────────────── */

function isPriceColumnHeader(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /^price\s*,?\s*(eur|gbp|usd)?$/i.test(t) ||
    /^total\s*,?\s*(eur|gbp|usd)?$/i.test(t)
  );
}

function isSummaryPriceLine(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /total\s+excl\.?\s*vat/i.test(t) ||
    /total\s+invoice/i.test(t) ||
    /total\s+incl\.?\s*vat/i.test(t) ||
    /subtotal/i.test(t) ||
    /grand\s*total/i.test(t)
  );
}

function isRedactableLine(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /all prices excl/i.test(t) ||
    /all openings shown as/i.test(t) ||
    /^pricing$/i.test(t) ||
    /^pricing\s*$/i.test(t)
  );
}

function isOrderNoPrefix(str: string): boolean {
  return /^order\s*no\.?\s*:?\s*/i.test(str.trim());
}

/** Check if a standalone price value like "1370,-" or "4910,-" */
function isStandalonePrice(str: string): boolean {
  const t = str.trim();
  // Match patterns like "1370,-" or "4 910,-" or "1.370,-"
  return /^\d[\d\s.,]*,-$/.test(t);
}

/* ── Line grouping ──────────────────────────────────────────── */

interface LineGroup {
  fragments: TextFragment[];
  text: string;
  y: number;
}

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
      currentLine.sort((a, b) => a.x - b.x);
      lines.push({ fragments: currentLine, text: currentLine.map(f => f.str).join(' '), y: currentY });
      currentLine = [item];
      currentY = item.y;
    }
  }
  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push({ fragments: currentLine, text: currentLine.map(f => f.str).join(' '), y: currentY });
  }
  return lines;
}

/* ── Redact helper ──────────────────────────────────────────── */

function addRedactRegion(
  frag: TextFragment,
  pageIndex: number,
  padding: number,
  regions: RedactRegion[]
) {
  regions.push({
    page: pageIndex,
    x: frag.x - padding,
    y: frag.y - padding,
    width: frag.width + padding * 2,
    height: frag.height + padding * 2,
  });
}

function addRedactRegionForFragments(
  frags: TextFragment[],
  pageIndex: number,
  padding: number,
  regions: RedactRegion[]
) {
  if (frags.length === 0) return;
  const minX = Math.min(...frags.map(f => f.x));
  const maxX = Math.max(...frags.map(f => f.x + f.width));
  const minY = Math.min(...frags.map(f => f.y));
  const maxHeight = Math.max(...frags.map(f => f.height));
  regions.push({
    page: pageIndex,
    x: minX - padding,
    y: minY - padding,
    width: (maxX - minX) + padding * 2,
    height: maxHeight + padding * 2,
  });
}

/* ── Logo loader ────────────────────────────────────────────── */

async function loadLogoPng(): Promise<Uint8Array> {
  const data = await loadLogoAsUint8Array();
  if (!data) throw new Error('Failed to load logo from storage');
  return data;
}

/* ── Main export ────────────────────────────────────────────── */

export async function stripPricesFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const copyForPdfJs = arrayBuffer.slice(0);
  const copyForPdfLib = arrayBuffer.slice(0);

  const pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(copyForPdfJs) }).promise;
  const redactRegions: RedactRegion[] = [];
  const padding = 4;

  // Track price column X-ranges across ALL pages (headers usually on page 1, apply to all)
  const priceColumnRanges: ColumnRange[] = [];

  for (let i = 1; i <= pdfJs.numPages; i++) {
    const page = await pdfJs.getPage(i);
    const content = await page.getTextContent();
    const pageIndex = i - 1;

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

    const lines = groupIntoLines(fragments);

    for (const line of lines) {
      const lineText = line.text;

      // 1. Detect price column headers and record their X-ranges
      for (const frag of line.fragments) {
        if (isPriceColumnHeader(frag.str)) {
          priceColumnRanges.push({
            minX: frag.x - padding * 2,
            maxX: frag.x + frag.width + padding * 2,
          });
          addRedactRegion(frag, pageIndex, padding, redactRegions);
        }
      }

      // 2. Redact "Pricing" section header
      if (isRedactableLine(lineText)) {
        addRedactRegionForFragments(line.fragments, pageIndex, padding, redactRegions);
        continue;
      }

      // 3. Redact summary price lines (Total excl. VAT, TOTAL INVOICE, etc.)
      if (isSummaryPriceLine(lineText)) {
        addRedactRegionForFragments(line.fragments, pageIndex, padding, redactRegions);
        continue;
      }

      // 4. Redact "Order No." prefix only (keep the reference after it)
      if (isOrderNoPrefix(lineText)) {
        const orderFrags = line.fragments.filter(f =>
          /order|no\.?|:/i.test(f.str.trim())
        );
        if (orderFrags.length > 0) {
          addRedactRegionForFragments(orderFrags, pageIndex, padding, redactRegions);
        }
      }

      // 5. Column-based redaction: redact fragments that fall in known price columns
      if (priceColumnRanges.length > 0) {
        for (const frag of line.fragments) {
          // Skip if this fragment IS the header we already redacted
          if (isPriceColumnHeader(frag.str)) continue;
          
          const fragCenter = frag.x + frag.width / 2;
          for (const col of priceColumnRanges) {
            if (fragCenter >= col.minX && fragCenter <= col.maxX) {
              addRedactRegion(frag, pageIndex, padding, redactRegions);
              break;
            }
          }
        }
      }

      // 6. Catch standalone price values outside columns (e.g. "1370,-")
      for (const frag of line.fragments) {
        if (isStandalonePrice(frag.str)) {
          // Make sure it's not inside a dimension like "1340x1550mm"
          const fragIdx = line.fragments.indexOf(frag);
          const prevStr = fragIdx > 0 ? line.fragments[fragIdx - 1].str : '';
          const nextStr = fragIdx < line.fragments.length - 1 ? line.fragments[fragIdx + 1].str : '';
          const context = prevStr + frag.str + nextStr;
          if (/\d+\s*[xX×]\s*\d+/.test(context)) continue;
          addRedactRegion(frag, pageIndex, padding, redactRegions);
        }
      }
    }
  }

  // Use pdf-lib to draw white rectangles + add branding
  const pdfDoc = await PDFDocument.load(copyForPdfLib);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const region of redactRegions) {
    if (region.page >= pages.length) continue;
    const pg = pages[region.page];
    pg.drawRectangle({
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      color: rgb(1, 1, 1),
    });
  }

  // Add logo to page 1
  try {
    const logoBytes = await loadLogoPng();
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const firstPage = pages[0];
    const { width: pageW, height: pageH } = firstPage.getSize();
    const logoW = 170;
    const logoH = logoW * (logoImage.height / logoImage.width);
    const logoX = pageW - logoW - 30;
    const logoY = pageH - logoH - 20;
    firstPage.drawImage(logoImage, { x: logoX, y: logoY, width: logoW, height: logoH });
  } catch (err) {
    console.warn('Could not embed logo in cleaned PDF:', err);
  }

  // Add footer to every page
  const totalPages = pages.length;
  const footerFontSize = 8;
  const footerY = 25;
  const lineY = 38;

  for (let pi = 0; pi < totalPages; pi++) {
    const pg = pages[pi];
    const { width: pageW } = pg.getSize();

    pg.drawLine({
      start: { x: 30, y: lineY },
      end: { x: pageW - 30, y: lineY },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

    const footerText = `${COMPANY_NAME}  |  ${COMPANY_ADDRESS}`;
    pg.drawText(footerText, {
      x: 30, y: footerY, size: footerFontSize, font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const pageNumText = `${pi + 1} of ${totalPages}`;
    const pageNumWidth = font.widthOfTextAtSize(pageNumText, footerFontSize);
    pg.drawText(pageNumText, {
      x: pageW - 30 - pageNumWidth, y: footerY, size: footerFontSize, font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const modifiedBytes = await pdfDoc.save();
  const base64 = uint8ArrayToBase64(modifiedBytes);
  return `data:application/pdf;base64,${base64}`;
}

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
