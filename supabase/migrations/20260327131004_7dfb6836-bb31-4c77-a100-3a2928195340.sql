
-- Create role enum
create type public.app_role as enum ('admin', 'manager', 'field');

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- User roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function for role checks (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

-- Ensure profile exists on first login (creates profile + seeds admin for specific email)
create or replace function public.ensure_profile_exists()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _email text;
begin
  if _uid is null then return; end if;
  if exists (select 1 from public.profiles where id = _uid) then return; end if;

  select email into _email from auth.users where id = _uid;
  insert into public.profiles (id, display_name) values (_uid, coalesce(_email, ''));

  if _email = 'lukas@timelesswindows.co.uk' then
    insert into public.user_roles (user_id, role) values (_uid, 'admin')
    on conflict (user_id, role) do nothing;
  end if;
end;
$$;

-- Profiles RLS policies
create policy "Users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Self insert profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Admins insert profiles" on public.profiles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Admins update profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- User roles RLS policies
create policy "Users read own role" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "Admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update roles" on public.user_roles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
