const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import * as mupdf from "npm:mupdf";

/* ── Helpers ────────────────────────────────────────────────── */

function quadToRect(q: number[]): [number, number, number, number] {
  return [
    Math.min(q[0], q[4]),
    Math.min(q[1], q[3]),
    Math.max(q[2], q[6]),
    Math.max(q[5], q[7]),
  ];
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const sz = 32768;
  for (let i = 0; i < bytes.length; i += sz) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + sz, bytes.length))));
  }
  return btoa(chunks.join(""));
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

const EURO_RE = /^\d{3,5},-$/;

/* ── Constants matching the Python skill exactly ───────────── */
const COMPANY_NAME = 'Timeless Windows Ltd';
const COMPANY_ADDRESS = '2 New Kings Rd London SW6 4SA';
const FOOTER_TEXT = `${COMPANY_NAME} | ${COMPANY_ADDRESS}`;
const FOOTER_SIZE = 9;
const FOOTER_BASELINE_Y = 838.9;
const PAGENUM_X = 556.77;
const LOGO_RECT = { x0: 425.978, y0: 9.939, x1: 583.103, y1: 50.162 };

/* ── Extract words using structured text ───────────────────── */

interface WordInfo {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function extractWords(page: any): WordInfo[] {
  const words: WordInfo[] = [];
  try {
    const stext = page.toStructuredText("preserve-whitespace");
    const blocks = stext.asJSON();
    const parsed = typeof blocks === "string" ? JSON.parse(blocks) : blocks;

    for (const block of parsed.blocks || parsed) {
      for (const line of block.lines || []) {
        for (const span of line.spans || []) {
          if (span.text && span.bbox) {
            const t = span.text.trim();
            if (t) {
              words.push({
                text: t,
                x0: span.bbox[0] ?? span.bbox.x0,
                y0: span.bbox[1] ?? span.bbox.y0,
                x1: span.bbox[2] ?? span.bbox.x1,
                y1: span.bbox[3] ?? span.bbox.y1,
              });
            }
          }
        }

        // Fallback: line-level text for euro amounts
        if (line.text && line.bbox) {
          const t = line.text.trim();
          if (t && EURO_RE.test(t)) {
            words.push({
              text: t,
              x0: line.bbox[0] ?? line.bbox.x0,
              y0: line.bbox[1] ?? line.bbox.y0,
              x1: line.bbox[2] ?? line.bbox.x1,
              y1: line.bbox[3] ?? line.bbox.y1,
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn("[clean-pdf] Structured text extraction failed:", e);
  }
  return words;
}

/* ── Fetch logo from Supabase storage ──────────────────────── */

async function fetchLogo(): Promise<Uint8Array | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return null;

    const url = `${supabaseUrl}/storage/v1/object/public/logo/timeless-logo.png`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/* ── Main handler ───────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pdf_base64 } = await req.json();
    if (!pdf_base64) {
      return new Response(JSON.stringify({ error: "Missing pdf_base64" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBytes = base64ToUint8(pdf_base64);
    console.log(`[clean-pdf] Received PDF: ${pdfBytes.length} bytes`);

    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf") as any;
    const numPages = doc.countPages();
    console.log(`[clean-pdf] Pages: ${numPages}`);

    // ── Collect header data from page 0 using search() ──
    let twBaselineY: number | null = null;
    let orderText: string | null = null;
    let orderX: number | null = null;

    const page0 = doc.loadPage(0);

    // Use search() to find "Timeless Windows Ltd" — this reliably works
    const twQuads = page0.search("Timeless Windows Ltd");
    for (const quad of twQuads) {
      const r = quadToRect(quad);
      if (r[1] < 100) {
        // Use y0 as baseline approximation (search returns bounding box)
        twBaselineY = r[1];
        console.log(`[clean-pdf] Found TW header at y=${r[1]}`);
      }
    }

    // Use search() to find "Order No."
    const orderQuads = page0.search("Order No.");
    for (const quad of orderQuads) {
      const r = quadToRect(quad);
      if (r[1] > 85 && r[1] < 110) {
        orderX = r[0];
        // Try to get the full Order No. text from structured text
        const words = extractWords(page0);
        for (const w of words) {
          if (w.text.startsWith("Order No.") && w.y0 < 110) {
            orderText = w.text;
            orderX = w.x0;
            break;
          }
        }
        // Fallback: just use "Order No." if structured text didn't find full text
        if (!orderText) {
          orderText = "Order No.";
        }
        console.log(`[clean-pdf] Found Order: "${orderText}" at x=${orderX}`);
      }
    }

    console.log(`[clean-pdf] Header data: twBaselineY=${twBaselineY}, orderText=${orderText}`);

    // ── Process each page ──
    for (let i = 0; i < numPages; i++) {
      const page = doc.loadPage(i);

      const addRedact = (rect: [number, number, number, number]) => {
        const annot = page.createAnnotation("Redact");
        annot.setRect(rect);
      };

      // ── 1. Price column headers: "Price," with +30 to cover "EUR" ──
      for (const quad of page.search("Price,")) {
        const r = quadToRect(quad);
        addRedact([r[0] - 2, r[1], r[2] + 30, r[3]]);
      }

      // ── 2. "Total," — only right column (x > 400) ──
      for (const quad of page.search("Total,")) {
        const r = quadToRect(quad);
        if (r[0] > 400) {
          addRedact([r[0] - 2, r[1], r[2] + 30, r[3]]);
        }
      }

      // ── 3. Euro amounts — tight bounds, y1 - 0.3 ──
      const words = extractWords(page);
      let euroMatchCount = 0;
      for (const w of words) {
        if (EURO_RE.test(w.text)) {
          addRedact([w.x0 - 2, w.y0, w.x1 + 2, w.y1 - 0.3]);
          euroMatchCount++;
        }
      }

      // Fallback: search for ",-" if structured text found nothing
      if (euroMatchCount === 0) {
        for (const quad of page.search(",-")) {
          const r = quadToRect(quad);
          addRedact([r[0] - 60, r[1], r[2] + 2, r[3] - 0.3]);
        }
      }

      // ── 4. Summary phrases ──
      for (const phrase of [
        "Total excl. VAT:",
        "TOTAL INVOICE:",
        "All prices excl. VAT and transport cost.",
      ]) {
        for (const quad of page.search(phrase)) {
          const r = quadToRect(quad);
          addRedact([r[0] - 2, r[1], r[2] + 2, r[3]]);
        }
      }

      // ── 5. Page-1-only redactions ──
      if (i === 0) {
        for (const variant of [
          "All openings shown as english openings",
          "All openings shown as English openings",
        ]) {
          for (const quad of page.search(variant)) {
            const r = quadToRect(quad);
            addRedact([r[0] - 2, r[1], r[2] + 2, r[3]]);
          }
        }

        // "Timeless Windows Ltd" header — only y < 100
        for (const quad of page.search("Timeless Windows Ltd")) {
          const r = quadToRect(quad);
          if (r[1] < 100) {
            addRedact([r[0] - 2, r[1], r[2] + 2, r[3]]);
          }
        }

        // "Order No." line — redact between y 85–110, extend to page edge
        if (orderText) {
          for (const quad of page.search("Order No.")) {
            const r = quadToRect(quad);
            if (r[1] > 85 && r[1] < 110) {
              const pageRect = page.getBounds();
              addRedact([r[0] - 2, r[1], pageRect[2] - 50, r[3]]);
            }
          }
        }
      }

      // ── Apply redactions — no fill, preserve line art ──
      page.applyRedactions(false, 0);

      // ── Clean residual graphics operators ──
      try {
        page.cleanContents();
      } catch (_e) {
        // cleanContents may not be available in all versions
      }

      // ── 6. Re-insert "Order No." at TW header position ──
      if (i === 0 && orderText && twBaselineY !== null) {
        try {
          const font = new mupdf.Font("Times-Roman");
          const textObj = page.createText();
          const matrix = mupdf.Matrix.translate(orderX ?? 50, twBaselineY + 10);
          textObj.showString(font, matrix, 12, orderText);
          page.insertText(textObj);
          console.log(`[clean-pdf] Re-inserted Order No. at y=${twBaselineY}`);
        } catch (e) {
          console.warn("[clean-pdf] Could not re-insert Order No.:", e);
        }
      }

      // ── 7. Footer: centred company address + page number ──
      try {
        const font = new mupdf.Font("Times-Roman");
        const footerWidth = font.advanceGlyph(32) * FOOTER_SIZE * FOOTER_TEXT.length; // approximate
        const footerX = (595.3 - footerWidth) / 2;

        // Footer text
        const footerObj = page.createText();
        const footerMatrix = mupdf.Matrix.translate(footerX > 0 ? footerX : 100, FOOTER_BASELINE_Y);
        footerObj.showString(font, footerMatrix, FOOTER_SIZE, FOOTER_TEXT);
        page.insertText(footerObj);

        // Page number
        const pageNumText = `${i + 1} of ${numPages}`;
        const pageNumObj = page.createText();
        const pageNumMatrix = mupdf.Matrix.translate(PAGENUM_X, FOOTER_BASELINE_Y);
        pageNumObj.showString(font, pageNumMatrix, FOOTER_SIZE, pageNumText);
        page.insertText(pageNumObj);
      } catch (e) {
        console.warn("[clean-pdf] Could not insert footer:", e);
      }
    }

    // ── Logo on page 1 ──
    try {
      const logoBytes = await fetchLogo();
      if (logoBytes) {
        const page0Final = doc.loadPage(0);
        const imgObj = doc.addImage(new mupdf.Image(logoBytes));
        // Insert image at the skill's exact rect
        const resources = page0Final.getResourceDictionary();
        // Use content stream approach for image placement
        console.log("[clean-pdf] Logo fetched, attempting insertion");
        // MuPDF WASM image insertion is limited — we'll let client handle logo
      }
    } catch (e) {
      console.warn("[clean-pdf] Logo insertion skipped:", e);
    }

    // Save
    const outBuf = doc.saveToBuffer("compress");
    const outBytes: Uint8Array = outBuf.asUint8Array();
    console.log(`[clean-pdf] Output PDF: ${outBytes.length} bytes`);

    const outBase64 = uint8ToBase64(outBytes);
    doc.destroy();

    return new Response(JSON.stringify({
      pdf_base64: outBase64,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[clean-pdf] Error:", err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
