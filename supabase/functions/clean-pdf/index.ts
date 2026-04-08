const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import * as mupdf from "npm:mupdf";

/* ── Helpers ────────────────────────────────────────────────── */

/** Convert a MuPDF search quad (8 floats) to a rect [x0, y0, x1, y1]. */
function quadToRect(q: number[]): [number, number, number, number] {
  return [
    Math.min(q[0], q[4]),  // x0 left
    Math.min(q[1], q[3]),  // y0 top
    Math.max(q[2], q[6]),  // x1 right
    Math.max(q[5], q[7]),  // y1 bottom
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

    // Open the document
    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf") as any;
    const numPages = doc.countPages();
    console.log(`[clean-pdf] Pages: ${numPages}`);

    for (let i = 0; i < numPages; i++) {
      const page = doc.loadPage(i);

      const addRedact = (rect: [number, number, number, number]) => {
        const annot = page.createAnnotation("Redact");
        annot.setRect(rect);
      };

      // 1. "Price," header — extend right by 30 to cover "EUR"
      for (const quad of page.search("Price,")) {
        const r = quadToRect(quad);
        addRedact([r[0] - 2, r[1], r[2] + 30, r[3]]);
      }

      // 2. "Total," — only right column (x > 400) to avoid "Total sq.m.:"
      for (const quad of page.search("Total,")) {
        const r = quadToRect(quad);
        if (r[0] > 400) {
          addRedact([r[0] - 2, r[1], r[2] + 30, r[3]]);
        }
      }

      // 3. Euro amounts — search for ",-" suffix, extend left to cover digits
      //    Tight bottom bound (y1 - 0.3) to avoid bleeding over table separator lines
      for (const quad of page.search(",-")) {
        const r = quadToRect(quad);
        addRedact([r[0] - 60, r[1], r[2] + 2, r[3] - 0.3]);
      }

      // 4. Summary phrases (last page typically)
      const summaryPhrases = [
        "Total excl. VAT:",
        "TOTAL INVOICE:",
        "All prices excl. VAT and transport cost.",
      ];
      for (const phrase of summaryPhrases) {
        for (const quad of page.search(phrase)) {
          const r = quadToRect(quad);
          // Extend right by 80 to cover the value after the label
          addRedact([r[0] - 2, r[1], r[2] + 80, r[3]]);
        }
      }

      // Apply all redactions — no black boxes, preserve images
      page.applyRedactions(false, 0);
    }

    // Save the cleaned PDF
    const outBuf = doc.saveToBuffer("compress");
    const outBytes: Uint8Array = outBuf.asUint8Array();
    console.log(`[clean-pdf] Output PDF: ${outBytes.length} bytes`);

    const outBase64 = uint8ToBase64(outBytes);

    doc.destroy();

    return new Response(JSON.stringify({ pdf_base64: outBase64 }), {
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
