
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Fitter',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can read employees" ON public.employees
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage employees" ON public.employees
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));

CREATE TABLE public.labour_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_date date NOT NULL,
  kind text NOT NULL DEFAULT 'item' CHECK (kind IN ('item', 'extra')),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  quote_ref text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  line_item_id text,
  unit_index integer,
  item_desc text NOT NULL DEFAULT '',
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  labour_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_fields_present CHECK (
    kind <> 'item' OR (line_item_id IS NOT NULL AND unit_index IS NOT NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.labour_assignments TO authenticated;
GRANT ALL ON public.labour_assignments TO service_role;

CREATE UNIQUE INDEX labour_assignments_unit_employee_unique
  ON public.labour_assignments (line_item_id, unit_index, employee_id)
  WHERE kind = 'item';

CREATE INDEX labour_assignments_date_idx ON public.labour_assignments (work_date);
CREATE INDEX labour_assignments_employee_idx ON public.labour_assignments (employee_id);

ALTER TABLE public.labour_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can read labour assignments" ON public.labour_assignments
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage labour assignments" ON public.labour_assignments
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
