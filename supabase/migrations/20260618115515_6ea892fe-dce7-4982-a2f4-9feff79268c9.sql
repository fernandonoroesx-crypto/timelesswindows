-- Drop overly permissive public policies
DROP POLICY IF EXISTS "Allow all access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all access to global_settings" ON public.global_settings;
DROP POLICY IF EXISTS "Allow all access to managed_projects" ON public.managed_projects;
DROP POLICY IF EXISTS "Allow all access to projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all access to quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow all access to suppliers" ON public.suppliers;

-- clients: all authenticated can read; admin/manager can write
CREATE POLICY "Authenticated users can read clients"
  ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- global_settings: all authenticated can read; admin only can write
CREATE POLICY "Authenticated users can read global settings"
  ON public.global_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage global settings"
  ON public.global_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- managed_projects: all authenticated can read and update (field users advance stages);
-- admin/manager can create and delete
CREATE POLICY "Authenticated users can read managed projects"
  ON public.managed_projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update managed projects"
  ON public.managed_projects FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins and managers can insert managed projects"
  ON public.managed_projects FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins and managers can delete managed projects"
  ON public.managed_projects FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- projects (legacy table): all authenticated can read; admin/manager can write
CREATE POLICY "Authenticated users can read projects"
  ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- quotes: all authenticated can read; admin/manager can write
CREATE POLICY "Authenticated users can read quotes"
  ON public.quotes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage quotes"
  ON public.quotes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- suppliers: all authenticated can read; admin/manager can write
CREATE POLICY "Authenticated users can read suppliers"
  ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage suppliers"
  ON public.suppliers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));