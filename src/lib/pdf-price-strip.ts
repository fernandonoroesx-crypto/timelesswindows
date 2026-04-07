import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';

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

/**
 * Group text items into visual lines based on vertical proximity.
 */
function groupIntoLines(items: TextFragment[], tolerance = 4): LineGroup[] {
  if (items.length === 0) return [];

  // Sort by Y descending (PDF coords), then X ascending
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
  // Sort left to right
  fragments.sort((a, b) => a.x - b.x);
  const text = fragments.map(f => f.str).join('');
  const minX = Math.min(...fragments.map(f => f.x));
  const maxX = Math.max(...fragments.map(f => f.x + f.width));
  const y = fragments[0].y;
  const height = Math.max(...fragments.map(f => f.height));
  return { fragments, text, minX, maxX, y, height };
}

/**
 * Check if a string looks like a dimension (e.g., "1200x800", "1200 x 800", "1200mm").
 */
function isDimension(str: string): boolean {
  return /\d+\s*[xX×]\s*\d+/.test(str) || /\d+\s*mm/i.test(str);
}

/**
 * Find price spans within a line's concatenated text and map them back to fragment indices.
 * Returns arrays of fragment index ranges that should be redacted.
 */
function findPriceSpans(line: LineGroup): Array<{ startFrag: number; endFrag: number }> {
  const { text, fragments } = line;

  // Skip lines that look like dimensions
  if (isDimension(text)) return [];

  // Price patterns to detect in the concatenated line text
  const pricePatterns = [
    /[£€]\s*[\d\s.,]+[\d]/g,                    // £1,234 or € 587
    /[\d\s.,]+[\d]\s*[£€]/g,                     // 1,234€
    /\d[\d\s.]*\d\s*[,.][-–—]/g,                 // 587,- or 1 223,-
    /\d{1,3}([,.]\d{3})*[,.]\d{2}(?!\s*mm)/g,    // 1,234.56 (not mm)
    /(?<!\d)\d{2,6}\s*[,.][-–—]\s*$/gm,          // "587,-" at end
    /(?<!\d)\d{2,6}\s*[,.][-–—]/g,               // "587,-" anywhere
  ];

  const spans: Array<{ start: number; end: number }> = [];

  for (const pattern of pricePatterns) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const matchStr = match[0].trim();
      // Skip very short matches or pure dimension-like matches
      if (matchStr.length < 2) continue;
      if (/^\d{1,4}\s*mm$/i.test(matchStr)) continue;

      spans.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  if (spans.length === 0) return [];

  // Merge overlapping spans
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

  // Map text character positions back to fragment indices
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

/**
 * Strip prices from a supplier PDF by drawing white rectangles over price text.
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

    // Extract text fragments
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

    // Group into lines and find price spans
    const lines = groupIntoLines(fragments);

    for (const line of lines) {
      const spans = findPriceSpans(line);

      for (const span of spans) {
        // Build bounding box from matched fragments
        const matchedFrags = line.fragments.slice(span.startFrag, span.endFrag + 1);
        if (matchedFrags.length === 0) continue;

        const minX = Math.min(...matchedFrags.map(f => f.x));
        const maxX = Math.max(...matchedFrags.map(f => f.x + f.width));
        const minY = Math.min(...matchedFrags.map(f => f.y));
        const maxHeight = Math.max(...matchedFrags.map(f => f.height));

        const padding = 4;
        priceRegions.push({
          page: i - 1, // 0-indexed for pdf-lib
          x: minX - padding,
          y: minY - padding,
          width: (maxX - minX) + padding * 2,
          height: maxHeight + padding * 2,
        });
      }
    }
  }

  // 2. Use pdf-lib to draw white rectangles over price regions
  const pdfDoc = await PDFDocument.load(copyForPdfLib);
  const pages = pdfDoc.getPages();

  for (const region of priceRegions) {
    if (region.page >= pages.length) continue;
    const page = pages[region.page];

    page.drawRectangle({
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      color: rgb(1, 1, 1), // white
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
