
CREATE TABLE public.managed_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  quote_ref text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  project_type text NOT NULL DEFAULT 'standard',
  current_stage text NOT NULL DEFAULT 'won',
  survey_date date,
  order_date date,
  expected_delivery date,
  installation_date date,
  completion_date date,
  assigned_team jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.managed_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to managed_projects"
  ON public.managed_projects FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_managed_projects_updated_at
  BEFORE UPDATE ON public.managed_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
