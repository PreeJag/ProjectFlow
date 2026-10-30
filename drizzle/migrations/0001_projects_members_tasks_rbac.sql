-- ProjectFlow: projects, memberships, tasks, project_owner role, account activation

alter type public.app_role add value 'project_owner';

alter table public.profiles add column is_active boolean not null default true;
comment on column public.profiles.is_active is 'Mirror of the auth-level ban state set by admins; false = deactivated account';

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active','archived')),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo' check (status in ('todo','in_progress','done')),
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_idx on public.projects (owner_id);
create index project_members_user_idx on public.project_members (user_id);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_assignee_idx on public.tasks (assignee_id);

grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
grant select, insert, delete on public.project_members to authenticated;
grant all on public.project_members to service_role;
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

-- Helpers first (policies below reference them).
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.projects pr
    where pr.id = p_project_id
      and (
        pr.owner_id = auth.uid()
        or exists (
          select 1 from public.project_members m
          where m.project_id = pr.id and m.user_id = auth.uid()
        )
        or public.has_role(auth.uid(), 'admin')
      )
  )
$$;

create or replace function public.can_manage_project(p_project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.projects pr
    where pr.id = p_project_id
      and (pr.owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  )
$$;

-- Projects: visible to admins, owners and members only.
create policy "Admins owners and members can view projects"
  on public.projects for select to authenticated
  using (public.is_project_member(id));
create policy "Users can create projects they own"
  on public.projects for insert to authenticated
  with check (owner_id = auth.uid());
create policy "Owners and admins can update projects"
  on public.projects for update to authenticated
  using (public.can_manage_project(id))
  with check (public.can_manage_project(id));
create policy "Owners and admins can delete projects"
  on public.projects for delete to authenticated
  using (public.can_manage_project(id));

-- Memberships: visible to project participants; managed by owners and admins.
create policy "Project participants can view members"
  on public.project_members for select to authenticated
  using (public.is_project_member(project_id));
create policy "Owners and admins can add members"
  on public.project_members for insert to authenticated
  with check (public.can_manage_project(project_id));
create policy "Owners and admins can remove members"
  on public.project_members for delete to authenticated
  using (public.can_manage_project(project_id));

-- Tasks: readable and writable by project participants; admins and owners via is_project_member.
create policy "Project participants can view tasks"
  on public.tasks for select to authenticated
  using (public.is_project_member(project_id));
create policy "Project participants can create tasks"
  on public.tasks for insert to authenticated
  with check (public.is_project_member(project_id));
create policy "Project participants can update tasks"
  on public.tasks for update to authenticated
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));
create policy "Project participants can delete tasks"
  on public.tasks for delete to authenticated
  using (public.is_project_member(project_id));

-- Profiles: admins can see the full directory and manage activation state.
create policy "Admins can view all profiles"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update account activation"
  on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
grant update (is_active) on public.profiles to authenticated;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();