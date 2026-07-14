CREATE TABLE public.labour_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT holiday_range_valid CHECK (end_date >= start_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.labour_holidays TO authenticated;
GRANT ALL ON public.labour_holidays TO service_role;

CREATE INDEX labour_holidays_employee_idx ON public.labour_holidays (employee_id);
CREATE INDEX labour_holidays_dates_idx ON public.labour_holidays (start_date, end_date);

ALTER TABLE public.labour_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can read labour holidays" ON public.labour_holidays
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage labour holidays" ON public.labour_holidays
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));