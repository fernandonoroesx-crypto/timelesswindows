import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WINDOW_TYPES = [
  "Casement", "Casement Flag", "Box Sash", "Fix Sash", "Spring Sash",
  "Door", "Door + Top Light", "French Door", "Patio Door",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentUplifts, currentInstallationSelling } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Boss, a friendly pricing assistant for window and door quotes. You help adjust uplift multipliers and installation selling prices.

Current uplift values (multiplier applied to manufacture price):
${JSON.stringify(currentUplifts, null, 2)}

Current installation selling prices (GBP per item):
${JSON.stringify(currentInstallationSelling, null, 2)}

Window/door types: ${WINDOW_TYPES.join(", ")}

When the user asks to change uplifts or installation prices, use the update_pricing tool.
- Uplift values are multipliers (e.g. 2.5 means 250% of manufacture price)
- Installation selling values are in GBP
- You can change one or many types at once
- Always confirm what you changed in the explanation

If the user asks a question that doesn't require pricing changes, just respond conversationally.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "update_pricing",
          description: "Update uplift multipliers and/or installation selling prices for window/door types",
          parameters: {
            type: "object",
            properties: {
              upliftChanges: {
                type: "object",
                description: "Map of window type to new uplift multiplier value. Keys must be exact type names.",
                additionalProperties: { type: "number" },
              },
              installationChanges: {
                type: "object",
                description: "Map of window type to new installation selling price in GBP",
                additionalProperties: { type: "number" },
              },
              explanation: {
                type: "string",
                description: "Brief explanation of what was changed",
              },
            },
            required: ["explanation"],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("boss-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
