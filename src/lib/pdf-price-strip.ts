import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Strip prices from a supplier PDF by drawing white rectangles over price text.
 * Returns the cleaned PDF as a base64 data URI string.
 */
export async function stripPricesFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  // Create independent copies to prevent "detached ArrayBuffer" errors
  const copyForPdfJs = arrayBuffer.slice(0);
  const copyForPdfLib = arrayBuffer.slice(0);

  // 1. Use pdfjs-dist to find price text coordinates
  const pdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(copyForPdfJs) }).promise;
  const priceRegions: Array<{ page: number; x: number; y: number; width: number; height: number }> = [];

  for (let i = 1; i <= pdfJs.numPages; i++) {
    const page = await pdfJs.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const textItem = item as any;
      const str: string = textItem.str;

      // Match price patterns:
      // "587,-" or "1223,-" (supplier format)
      // "€ 587" or "£1,234.56"
      // Standalone numbers that look like prices (3-6 digits followed by ,- or .-)
      const isPriceText =
        /^\s*\d{2,6}[,.\s]*[-–—]\s*$/.test(str) ||           // "587,-"
        /^\s*[£€]\s*[\d,.]+\s*$/.test(str) ||                  // "£1,234"
        /^\s*[\d,.]+\s*[£€]\s*$/.test(str) ||                  // "1,234€"
        /^\s*\d{1,3}([,.]\d{3})*[,.]\d{2}\s*$/.test(str);     // "1,234.56"

      if (isPriceText && str.trim().length > 0) {
        // Get transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
        const tx = textItem.transform;
        const x = tx[4];
        const y = tx[5];
        const width = textItem.width || str.length * 6;
        const height = Math.abs(tx[3]) || textItem.height || 12;

        priceRegions.push({
          page: i - 1, // 0-indexed for pdf-lib
          x: x - 2,
          y: y - 2,
          width: width + 4,
          height: height + 4,
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
