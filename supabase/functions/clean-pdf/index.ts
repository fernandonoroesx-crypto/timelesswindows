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

/* ── Extract words with bounding boxes ──────────────────────── */

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
        // Build words from chars in each span
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

        // Fallback: line-level text
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

/* ── Extract header data from page 0 before redaction ───────── */

interface PageOneData {
  twBaselineY: number | null;
  orderText: string | null;
  orderX: number | null;
}

function extractPageOneData(page: any): PageOneData {
  const result: PageOneData = { twBaselineY: null, orderText: null, orderX: null };
  try {
    const stext = page.toStructuredText("preserve-whitespace");
    const blocks = stext.asJSON();
    const parsed = typeof blocks === "string" ? JSON.parse(blocks) : blocks;

    for (const block of parsed.blocks || parsed) {
      for (const line of block.lines || []) {
        for (const span of line.spans || []) {
          const text = (span.text || "").trim();
          const bbox = span.bbox;
          if (!bbox) continue;
          const y0 = bbox[1] ?? bbox.y0;

          if (text.includes("Timeless Windows Ltd") && y0 < 100) {
            // Use baseline y from origin if available, otherwise use y0
            result.twBaselineY = span.origin?.[1] ?? y0;
          }
          if (text.startsWith("Order No.") && y0 < 110) {
            result.orderText = text;
            result.orderX = span.origin?.[0] ?? (bbox[0] ?? bbox.x0);
          }
        }
      }
    }
  } catch (e) {
    console.warn("[clean-pdf] Page 1 data extraction failed:", e);
  }
  return result;
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

    // Store page-1 data for client-side use
    let pageOneData: PageOneData = { twBaselineY: null, orderText: null, orderX: null };

    for (let i = 0; i < numPages; i++) {
      const page = doc.loadPage(i);

      const addRedact = (rect: [number, number, number, number]) => {
        const annot = page.createAnnotation("Redact");
        annot.setRect(rect);
      };

      // ── Collect page-1 header data BEFORE redacting ──
      if (i === 0) {
        pageOneData = extractPageOneData(page);
        console.log(`[clean-pdf] Page 1 data:`, JSON.stringify(pageOneData));
      }

      // ── REMOVE: "Price," header — extend right by 30 to cover "EUR" ──
      for (const quad of page.search("Price,")) {
        const r = quadToRect(quad);
        addRedact([r[0] - 2, r[1], r[2] + 30, r[3]]);
      }

      // ── REMOVE: "Total," — only right column (x > 400) ──
      for (const quad of page.search("Total,")) {
        const r = quadToRect(quad);
        if (r[0] > 400) {
          addRedact([r[0] - 2, r[1], r[2] + 30, r[3]]);
        }
      }

      // ── REMOVE: Euro amounts — tight bounds, y1 - 0.3 ──
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

      // ── REMOVE: Summary phrases — tight bounds (skill: x1 + 2) ──
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

      // ── REMOVE: Page-1-only redactions ──
      if (i === 0) {
        // "All openings shown as english openings"
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
        if (pageOneData.orderText) {
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
    }

    // Save
    const outBuf = doc.saveToBuffer("compress");
    const outBytes: Uint8Array = outBuf.asUint8Array();
    console.log(`[clean-pdf] Output PDF: ${outBytes.length} bytes`);

    const outBase64 = uint8ToBase64(outBytes);
    doc.destroy();

    return new Response(JSON.stringify({
      pdf_base64: outBase64,
      page_one_data: pageOneData,
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
