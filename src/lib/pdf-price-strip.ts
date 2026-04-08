import { supabase } from '@/integrations/supabase/client';

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

  const { data, error } = await supabase.functions.invoke('clean-pdf', {
    body: { pdf_base64: inputBase64 },
  });

  if (error) throw new Error(`PDF cleaning failed: ${error.message}`);
  if (!data?.pdf_base64) throw new Error('No cleaned PDF returned from server');

  const cleanedBytes = base64ToUint8Array(data.pdf_base64);
  const base64 = uint8ArrayToBase64(cleanedBytes);
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
