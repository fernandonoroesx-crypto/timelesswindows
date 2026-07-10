
-- ============================================================
-- 1. PRIVATE SCHEMA + move has_role out of exposed API surface
-- ============================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- ============================================================
-- 2. Drop all policies referencing public.has_role, recreate using private.has_role
--    Also tighten SELECT to admin/manager, and restrict managed_projects UPDATE.
-- ============================================================

-- clients
DROP POLICY IF EXISTS "Admins and managers can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
CREATE POLICY "Admins and managers can read clients" ON public.clients
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage clients" ON public.clients
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));

-- global_settings
DROP POLICY IF EXISTS "Admins can manage global settings" ON public.global_settings;
DROP POLICY IF EXISTS "Authenticated users can read global settings" ON public.global_settings;
CREATE POLICY "Admins and managers can read global settings" ON public.global_settings
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins can manage global settings" ON public.global_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- projects
DROP POLICY IF EXISTS "Admins and managers can manage projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;
CREATE POLICY "Admins and managers can read projects" ON public.projects
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage projects" ON public.projects
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));

-- suppliers
DROP POLICY IF EXISTS "Admins and managers can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON public.suppliers;
CREATE POLICY "Admins and managers can read suppliers" ON public.suppliers
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage suppliers" ON public.suppliers
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));

-- quotes
DROP POLICY IF EXISTS "Admins and managers can manage quotes" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users can read quotes" ON public.quotes;
CREATE POLICY "Admins and managers can read quotes" ON public.quotes
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can manage quotes" ON public.quotes
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));

-- managed_projects
DROP POLICY IF EXISTS "Admins and managers can delete managed projects" ON public.managed_projects;
DROP POLICY IF EXISTS "Admins and managers can insert managed projects" ON public.managed_projects;
DROP POLICY IF EXISTS "Authenticated users can read managed projects" ON public.managed_projects;
DROP POLICY IF EXISTS "Authenticated users can update managed projects" ON public.managed_projects;
CREATE POLICY "Admins and managers can read managed projects" ON public.managed_projects
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can insert managed projects" ON public.managed_projects
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can update managed projects" ON public.managed_projects
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'))
  WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));
CREATE POLICY "Admins and managers can delete managed projects" ON public.managed_projects
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'manager'));

-- profiles
DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "Admins delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins update roles" ON public.user_roles;
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Drop public.has_role now that nothing references it
-- ============================================================
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- ============================================================
-- 4. Convert ensure_profile_exists to SECURITY INVOKER (no admin seeding)
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
declare
  _uid uuid := auth.uid();
begin
  if _uid is null then return; end if;
  if exists (select 1 from public.profiles where id = _uid) then return; end if;
  insert into public.profiles (id, display_name) values (_uid, '')
  on conflict (id) do nothing;
end;
$$;

REVOKE ALL ON FUNCTION public.ensure_profile_exists() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO authenticated;

-- ============================================================
-- 5. Storage: drop public SELECT policy on logo bucket to prevent listing.
--    Files remain reachable via public URLs because bucket is marked public.
-- ============================================================
DROP POLICY IF EXISTS "Public read access on logo bucket" ON storage.objects;
