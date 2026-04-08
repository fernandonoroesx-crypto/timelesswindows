import { supabase } from '@/integrations/supabase/client';

const LOGO_FILENAME = 'timeless-logo.png';

export function getLogoUrl(): string {
  const { data } = supabase.storage.from('logo').getPublicUrl(LOGO_FILENAME);
  return data.publicUrl;
}

export async function loadLogoAsArrayBuffer(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(getLogoUrl());
    if (!response.ok) return null;
    return response.arrayBuffer();
  } catch {
    return null;
  }
}

export async function loadLogoAsBase64(): Promise<string | null> {
  try {
    const response = await fetch(getLogoUrl());
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function loadLogoAsUint8Array(): Promise<Uint8Array | null> {
  const buf = await loadLogoAsArrayBuffer();
  return buf ? new Uint8Array(buf) : null;
}
