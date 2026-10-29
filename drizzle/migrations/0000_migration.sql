-- ProjectFlow: roles, profiles, and secure one-time administrator setup
create type public.app_role as enum ('admin', 'user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- One-time administrator setup control. No Data API grants for anon/authenticated:
-- only trusted server-side code (service_role) may read or change it.
create table public.admin_setup_state (
  id integer primary key default 1 check (id = 1),
  completed boolean not null default false,
  operator_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
insert into public.admin_setup_state (id) values (1);

grant select, insert on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
grant all on public.admin_setup_state to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.admin_setup_state enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);
create policy "Users can update only their own profile name"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
create policy "Users can view their own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
-- admin_setup_state: RLS enabled with no policies -> denied for anon/authenticated.

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Trusted one-time promotion. Executable ONLY by service_role (trusted server
-- code); revoked from public/anon/authenticated so no user can call it.
create or replace function public.promote_initial_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if (select completed from public.admin_setup_state where id = 1) then
    raise exception 'SETUP_ALREADY_COMPLETED: administrator setup can be performed only once';
  end if;

  select id into v_user_id from public.profiles where lower(email) = lower(p_email);
  if v_user_id is null then
    raise exception 'USER_NOT_FOUND: no registered user exists with that email';
  end if;

  delete from public.user_roles where user_id = v_user_id;
  insert into public.user_roles (user_id, role) values (v_user_id, 'admin');

  update public.admin_setup_state
     set completed = true, operator_user_id = v_user_id, completed_at = now()
   where id = 1 and completed = false;

  return v_user_id;
end;
$$;

revoke all on function public.promote_initial_admin(text) from public, anon, authenticated;
grant execute on function public.promote_initial_admin(text) to service_role;

-- Auto-create profile and standard 'user' role on signup (never admin).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_changed()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_changed();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
