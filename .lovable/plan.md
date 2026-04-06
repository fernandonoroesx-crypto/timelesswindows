

## Plan: Create Dedicated Quotes Database Table (Full Data)

### Database migration

Create a `quotes` table mirroring all fields currently used in the `projects` table for quote data:

```sql
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL DEFAULT '',
  client text NOT NULL DEFAULT '',
  client_id uuid REFERENCES public.clients(id),
  project_manager_id text,
  project_manager_name text DEFAULT '',
  project_ref text NOT NULL DEFAULT '',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing jsonb,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quotes" ON public.quotes FOR ALL USING (true) WITH CHECK (true);
```

All fields stored: date, client name, client ID, PM info, project ref, settings (EUR rate, toggles, overhead days), **line items** (full item details — type, dimensions, supplier, prices, installation, architrave, trims, MDF, extras), pricing snapshot, status, and timestamps.

### Data migration

Copy all existing rows from `projects` into `quotes` so no data is lost.

### Code changes

| File | Change |
|---|---|
| `src/lib/database.ts` | Add `fetchQuotes`, `upsertQuote`, `deleteQuote` functions targeting the new `quotes` table |
| `src/lib/context.tsx` | Switch quote-related state to use the new quotes table functions instead of projects |
| `src/pages/QuoteBuilder.tsx` | No changes — reads from context |
| `src/pages/QuotesList.tsx` | No changes — reads from context |

### What the `quotes` table stores per quote

- **Header**: date, client, client ID, PM name/ID, project reference
- **Settings**: EUR→GBP rate, waste/making-good/supply-only toggles, overhead days
- **Line items**: every item row with ref, type, qty, dimensions, supplier, manufacture price/currency, uplift, installation type/override, architrave/trims/MDF types, extras
- **Pricing**: full pricing snapshot (selling rates, cost rates, extras, consumables, etc.)
- **Status**: draft / sent / won / lost / on-hold, sent timestamp

