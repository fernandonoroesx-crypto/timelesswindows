import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { loadLogoAsUint8Array } from './logo';
import { supabase } from '@/integrations/supabase/client';

/* ── Company branding constants ─────────────────────────────── */
const COMPANY_NAME = 'Timeless Windows Ltd';
const COMPANY_ADDRESS = '2 New Kings Rd London SW6 4SA';

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

/**
 * Strip prices from a supplier PDF using server-side MuPDF redaction,
 * then apply company branding (logo + footer) client-side with pdf-lib.
 */
export async function stripPricesFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const inputBytes = new Uint8Array(arrayBuffer);
  const inputBase64 = uint8ArrayToBase64(inputBytes);

  // 1. Call the clean-pdf edge function for true redaction
  const { data, error } = await supabase.functions.invoke('clean-pdf', {
    body: { pdf_base64: inputBase64 },
  });

  if (error) throw new Error(`PDF cleaning failed: ${error.message}`);
  if (!data?.pdf_base64) throw new Error('No cleaned PDF returned from server');

  // 2. Decode the cleaned PDF
  const cleanedBytes = base64ToUint8Array(data.pdf_base64);

  // 3. Apply branding with pdf-lib
  const pdfDoc = await PDFDocument.load(cleanedBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Add logo to page 1
  try {
    const logoBytes = await loadLogoAsUint8Array();
    if (logoBytes) {
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const firstPage = pages[0];
      const { width: pageW, height: pageH } = firstPage.getSize();
      const logoW = 170;
      const logoH = logoW * (logoImage.height / logoImage.width);
      firstPage.drawImage(logoImage, {
        x: pageW - logoW - 30,
        y: pageH - logoH - 20,
        width: logoW,
        height: logoH,
      });
    }
  } catch (err) {
    console.warn('Could not embed logo in cleaned PDF:', err);
  }

  // Add footer to every page
  const totalPages = pages.length;
  for (let pi = 0; pi < totalPages; pi++) {
    const pg = pages[pi];
    const { width: pageW } = pg.getSize();

    pg.drawLine({
      start: { x: 30, y: 38 },
      end: { x: pageW - 30, y: 38 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });

    const footerText = `${COMPANY_NAME}  |  ${COMPANY_ADDRESS}`;
    pg.drawText(footerText, {
      x: 30, y: 25, size: 8, font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const pageNumText = `${pi + 1} of ${totalPages}`;
    const pageNumWidth = font.widthOfTextAtSize(pageNumText, 8);
    pg.drawText(pageNumText, {
      x: pageW - 30 - pageNumWidth, y: 25, size: 8, font,
      color: rgb(0.3, 0.3, 0.3),
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
