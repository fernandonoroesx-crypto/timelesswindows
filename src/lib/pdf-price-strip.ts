import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { loadLogoAsUint8Array } from './logo';
import { supabase } from '@/integrations/supabase/client';

/* ── Company branding constants (matching skill spec) ──────── */
const COMPANY_NAME = 'Timeless Windows Ltd';
const COMPANY_ADDRESS = '2 New Kings Rd London SW6 4SA';
const FOOTER_TEXT = `${COMPANY_NAME} | ${COMPANY_ADDRESS}`;
const FOOTER_SIZE = 9;
const FOOTER_BASELINE_Y = 838.9; // from top in PDF coords
const PAGENUM_X = 556.77;
const LOGO_RECT = { x: 425.978, y: 9.939, w: 583.103 - 425.978, h: 50.162 - 9.939 };

/* ── Base64 helpers ─────────────────────────────────────────── */

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const sz = 32768;
  for (let i = 0; i < bytes.length; i += sz) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + sz, bytes.length))));
  }
  return btoa(chunks.join(''));
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* ── Main export ────────────────────────────────────────────── */

export async function stripPricesFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const inputBytes = new Uint8Array(arrayBuffer);
  const inputBase64 = uint8ArrayToBase64(inputBytes);

  // 1. Call edge function for true redaction
  const { data, error } = await supabase.functions.invoke('clean-pdf', {
    body: { pdf_base64: inputBase64 },
  });

  if (error) throw new Error(`PDF cleaning failed: ${error.message}`);
  if (!data?.pdf_base64) throw new Error('No cleaned PDF returned from server');

  const cleanedBytes = base64ToUint8Array(data.pdf_base64);
  const pageOneData = data.page_one_data || {};

  // 2. Apply branding with pdf-lib
  const pdfDoc = await PDFDocument.load(cleanedBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const totalPages = pages.length;

  // Logo on page 1
  try {
    const logoBytes = await loadLogoAsUint8Array();
    if (logoBytes) {
      const logoImage = await pdfDoc.embedPng(logoBytes);
      pages[0].drawImage(logoImage, {
        x: LOGO_RECT.x,
        y: pages[0].getHeight() - LOGO_RECT.y - LOGO_RECT.h,
        width: LOGO_RECT.w,
        height: LOGO_RECT.h,
      });
    }
  } catch (err) {
    console.warn('Could not embed logo:', err);
  }

  // Re-insert "Order No." text at Timeless Windows header position
  if (pageOneData.orderText && pageOneData.twBaselineY) {
    const pg = pages[0];
    const pageH = pg.getHeight();
    // Convert from PDF top-down coords to pdf-lib bottom-up
    const orderX = pageOneData.orderX || 50;
    const baselineY = pageH - pageOneData.twBaselineY;
    pg.drawText(pageOneData.orderText, {
      x: orderX,
      y: baselineY,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });
  }

  // Footer on every page
  const footerWidth = font.widthOfTextAtSize(FOOTER_TEXT, FOOTER_SIZE);
  const footerX = (595.3 - footerWidth) / 2;

  for (let pi = 0; pi < totalPages; pi++) {
    const pg = pages[pi];
    const pageH = pg.getHeight();
    const footerY = pageH - FOOTER_BASELINE_Y;

    pg.drawText(FOOTER_TEXT, {
      x: footerX,
      y: footerY,
      size: FOOTER_SIZE,
      font,
      color: rgb(0, 0, 0),
    });

    const pageNumText = `${pi + 1} of ${totalPages}`;
    pg.drawText(pageNumText, {
      x: PAGENUM_X,
      y: footerY,
      size: FOOTER_SIZE,
      font,
      color: rgb(0, 0, 0),
    });
  }

  const modifiedBytes = await pdfDoc.save();
  const base64 = uint8ArrayToBase64(modifiedBytes);
  return `data:application/pdf;base64,${base64}`;
}

/* ── Utility exports ────────────────────────────────────────── */

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
