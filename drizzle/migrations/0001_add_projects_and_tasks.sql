-- ProjectFlow: Projects, Tasks, and Comments
-- This migration adds the core project and task management tables

-- Task priority enum
create type public.task_priority as enum ('low', 'medium', 'high');

-- Task status enum
create type public.task_status as enum ('todo', 'in_progress', 'in_review', 'done');

-- Projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (key ~ '^[A-Z0-9_]+$') -- Project key must be uppercase alphanumeric with underscores
);

-- Project members table
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- 'owner', 'member'
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- Tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_number integer not null, -- Sequential number within project
  task_id text not null, -- Computed as project_key-number (e.g., LIB-1)
  title text not null,
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, task_number),
  unique (task_id),
  check (task_id ~ '^[A-Z0-9_]+-\d+$') -- Task ID format: KEY-NUMBER
);

-- Task comments table
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index idx_projects_owner_id on public.projects(owner_id);
create index idx_project_members_project_id on public.project_members(project_id);
create index idx_project_members_user_id on public.project_members(user_id);
create index idx_tasks_project_id on public.tasks(project_id);
create index idx_tasks_assignee_id on public.tasks(assignee_id);
create index idx_tasks_reporter_id on public.tasks(reporter_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_task_comments_task_id on public.task_comments(task_id);

-- Row Level Security
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

-- RLS Policies for Projects
-- Users can view projects they are members of
create policy "Users can view projects they are members of"
  on public.projects for select to authenticated
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = projects.id
      and project_members.user_id = auth.uid()
    )
  );

-- Users can update projects they own
create policy "Project owners can update their projects"
  on public.projects for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Users can insert projects (they become owner)
create policy "Authenticated users can create projects"
  on public.projects for insert to authenticated
  with check (owner_id = auth.uid());

-- Project owners can delete their projects
create policy "Project owners can delete their projects"
  on public.projects for delete to authenticated
  using (owner_id = auth.uid());

-- RLS Policies for Project Members
-- Users can view project members for projects they are members of
create policy "Users can view members of projects they belong to"
  on public.project_members for select to authenticated
  using (
    exists (
      select 1 from public.project_members pm2
      where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid()
    )
  );

-- RLS Policies for Tasks
-- Users can view tasks for projects they are members of
create policy "Users can view tasks from projects they belong to"
  on public.tasks for select to authenticated
  using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = tasks.project_id
      and project_members.user_id = auth.uid()
    )
  );

-- Users can update tasks they are assigned to or are project members
create policy "Project members can update tasks"
  on public.tasks for update to authenticated
  using (
    assignee_id = auth.uid() or
    exists (
      select 1 from public.project_members
      where project_members.project_id = tasks.project_id
      and project_members.user_id = auth.uid()
    )
  )
  with check (
    assignee_id = auth.uid() or
    exists (
      select 1 from public.project_members
      where project_members.project_id = tasks.project_id
      and project_members.user_id = auth.uid()
    )
  );

-- Users can insert tasks for projects they are members of
create policy "Project members can create tasks"
  on public.tasks for insert to authenticated
  with check (
    exists (
      select 1 from public.project_members
      where project_members.project_id = tasks.project_id
      and project_members.user_id = auth.uid()
    )
  );

-- Reporter or project owner can delete tasks
create policy "Reporter or project owner can delete tasks"
  on public.tasks for delete to authenticated
  using (
    reporter_id = auth.uid() or
    exists (
      select 1 from public.projects
      where projects.id = tasks.project_id
      and projects.owner_id = auth.uid()
    )
  );

-- RLS Policies for Task Comments
-- Users can view comments for tasks they can access
create policy "Users can view comments on accessible tasks"
  on public.task_comments for select to authenticated
  using (
    exists (
      select 1 from public.tasks
      where tasks.id = task_comments.task_id
      and exists (
        select 1 from public.project_members
        where project_members.project_id = tasks.project_id
        and project_members.user_id = auth.uid()
      )
    )
  );

-- Users can insert comments on tasks they can access
create policy "Project members can add comments"
  on public.task_comments for insert to authenticated
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.tasks
      where tasks.id = task_comments.task_id
      and exists (
        select 1 from public.project_members
        where project_members.project_id = tasks.project_id
        and project_members.user_id = auth.uid()
      )
    )
  );

-- Users can update their own comments
create policy "Users can update their own comments"
  on public.task_comments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users can delete their own comments
create policy "Users can delete their own comments"
  on public.task_comments for delete to authenticated
  using (user_id = auth.uid());

-- Function to generate task ID and number
create or replace function public.generate_task_id(p_project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_key text;
  v_next_number integer;
begin
  -- Get project key
  select key into v_project_key from public.projects where id = p_project_id;
  
  -- Get next task number for this project
  select coalesce(max(task_number), 0) + 1 into v_next_number
  from public.tasks
  where project_id = p_project_id;
  
  return v_project_key || '-' || v_next_number;
end;
$$;

-- Trigger to auto-set task_id and task_number before insert
create or replace function public.set_task_id_and_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.task_number is null then
    new.task_number := (select coalesce(max(task_number), 0) + 1 from public.tasks where project_id = new.project_id);
  end if;
  if new.task_id is null then
    new.task_id := public.generate_task_id(new.project_id);
  end if;
  return new;
end;
$$;

create trigger set_task_id_and_number_trigger
  before insert on public.tasks
  for each row execute function public.set_task_id_and_number();

-- Function to validate task status transitions
create or replace function public.validate_status_transition(
  p_current_status public.task_status,
  p_new_status public.task_status,
  p_user_id uuid,
  p_project_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_project_owner boolean;
begin
  -- Check if user is project owner
  select exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = p_user_id
  ) into v_is_project_owner;
  
  -- Valid transitions
  -- todo -> in_progress
  -- in_progress -> in_review
  -- in_review -> done
  -- done -> in_progress (only project owner can reopen)
  
  if p_current_status = 'todo' and p_new_status = 'in_progress' then
    return true;
  end if;
  
  if p_current_status = 'in_progress' and p_new_status = 'in_review' then
    return true;
  end if;
  
  if p_current_status = 'in_review' and p_new_status = 'done' then
    return true;
  end if;
  
  if p_current_status = 'done' and p_new_status = 'in_progress' and v_is_project_owner then
    return true;
  end if;
  
  -- Allow same status (no change)
  if p_current_status = p_new_status then
    return true;
  end if;
  
  return false;
end;
$$;

-- Trigger to validate status transitions on update
create or replace function public.validate_task_status_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if not public.validate_status_transition(old.status, new.status, auth.uid(), new.project_id) then
      raise exception 'INVALID_STATUS_TRANSITION: Cannot change status from % to %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_task_status_trigger
  before update of status on public.tasks
  for each row execute function public.validate_task_status_update();

-- Function to auto-add project owner as member when project is created
create or replace function public.add_owner_as_project_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

create trigger add_owner_as_member_trigger
  after insert on public.projects
  for each row execute function public.add_owner_as_project_member();

-- Function to validate task assignee is project member
create or replace function public.validate_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_id is not null then
    if not exists (
      select 1 from public.project_members
      where project_id = new.project_id and user_id = new.assignee_id
    ) then
      raise exception 'ASSIGNEE_NOT_MEMBER: Assignee must be a member of the project';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_task_assignee_trigger
  before insert or update of assignee_id on public.tasks
  for each row execute function public.validate_task_assignee();

-- Function to touch updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Updated_at triggers
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

create trigger task_comments_touch_updated_at
  before update on public.task_comments
  for each row execute function public.touch_updated_at();

-- Grant permissions
grant all on public.projects to authenticated;
grant all on public.project_members to authenticated;
grant all on public.tasks to authenticated;
grant all on public.task_comments to authenticated;
grant usage on all sequences in schema public to authenticated;
