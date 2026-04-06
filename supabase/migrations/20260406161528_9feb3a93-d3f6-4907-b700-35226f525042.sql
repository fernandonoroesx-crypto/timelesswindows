
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

-- Copy existing data from projects into quotes
INSERT INTO public.quotes (id, date, client, client_id, project_manager_id, project_manager_name, project_ref, settings, line_items, pricing, status, sent_at, created_at, updated_at)
SELECT id, date, client, client_id, project_manager_id, project_manager_name, project_ref, settings, line_items, pricing, status, sent_at, created_at, updated_at
FROM public.projects;
