
Diagnosis

- This is a data-shape issue, not a PM permission issue.
- I checked the saved backend data and found legacy MDF values still stored in the old format:
  - 1 PM pricing record is broken
  - 3 saved quote pricing records are broken
  - the global pricing record is also broken
- The broken shape looks like this:
```text
mdfSelling: { narrow: 17.5, wide: 35 }
```
but the app now expects:
```text
mdfSelling: {
  narrow: { single, baySide, bayCentral },
  wide:   { single, baySide, bayCentral }
}
```
- Because of that:
  - the PM editor can render no MDF rows (`Object.entries(number)` gives nothing)
  - MDF totals can calculate as 0 when a PM price is applied to a quote

Plan

1. Add a shared pricing normalizer
- Create a small helper that deep-merges pricing and repairs legacy MDF data.
- If `mdfSelling.narrow`, `mdfSelling.wide`, `mdfCost.narrow`, or `mdfCost.wide` is a number, convert it into a full `{ single, baySide, bayCentral }` object.

2. Use that normalizer everywhere pricing enters the app
- `src/lib/database.ts`
  - normalize global pricing when loading settings
  - normalize quote pricing when loading quotes
  - normalize PM pricing when loading clients
- `src/lib/context.tsx`
  - normalize `getProjectPricing()` so any existing saved quote always gets safe MDF data
- `src/pages/ClientsPage.tsx`
  - replace the current merge logic with the shared normalizer in:
    - `handleEdit`
    - `handleEnablePMPricing`
    - `handleUpdatePMPricing`
- `src/pages/QuoteBuilder.tsx`
  - normalize PM pricing inside `selectPM` before applying it to the quote
- `src/lib/pricing.ts`
  - normalize the pricing object before MDF calculations as a final safety net

3. Repair existing saved data
- Add a backend migration to rewrite existing legacy MDF pricing in:
  - `global_settings.value`
  - `quotes.pricing`
  - `clients.project_managers[*].pricing`
- This keeps old records from breaking again later and avoids depending only on runtime fixes.

4. Keep the PM UI stable
- Keep the MDF fallback rendering in `src/components/PricingEditor.tsx`, but rely on normalized pricing so the PM MDF rows always appear and save correctly.

Files to update

- new `src/lib/pricing-normalize.ts`
- `src/lib/database.ts`
- `src/lib/context.tsx`
- `src/pages/ClientsPage.tsx`
- `src/pages/QuoteBuilder.tsx`
- `src/lib/pricing.ts`
- new migration in `supabase/migrations/...`

Technical detail

```text
legacy scalar MDF
  narrow: 17.5
becomes
  narrow: {
    single: 17.5,
    baySide: 17.5,
    bayCentral: 17.5
  }
```

No schema change or RLS change is needed; this is a pricing normalization and saved-data repair fix.

QA

- Open the broken PM in Clients and confirm MDF Narrow/Wide fields appear
- Change PM MDF values, save, reopen, and verify they persist
- Create/select a quote using that PM and confirm MDF shows in the line breakdown and totals
- Open older saved quotes and the pricing settings screen to confirm legacy MDF data now loads correctly
