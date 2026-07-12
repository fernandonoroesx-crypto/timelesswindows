CREATE TABLE public.labour_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_date date NOT NULL,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  quote_ref text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  employee_ids uuid[] NOT NULL DEFAULT '{}',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.labour_bookings TO authenticated;
GRANT ALL ON public.labour_bookings TO service_role;

CREATE INDEX labour_bookings_date_idx ON public.labour_bookings (book_date);

ALTER TABLE public.labour_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can read labour bookings" ON public.labour_bookings
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage labour bookings" ON public.labour_bookings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));