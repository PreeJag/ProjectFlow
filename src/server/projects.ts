import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProjectStatus = "active" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";

export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner_id: string;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
  task_counts: { todo: number; in_progress: number; done: number };
  member_count: number;
};

export type TaskSummary = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: string | null;
  created_at: string;
  assignee_name: string | null;
};

export type ProjectMember = {
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  added_at: string;
};

export type ProjectDetail = {
  project: Omit<ProjectSummary, "task_counts" | "member_count">;
  members: ProjectMember[];
  tasks: TaskSummary[];
};

export type DirectoryUser = {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
};

export type DashboardData = {
  projects: ProjectSummary[];
  myTasks: TaskSummary[];
};

type SupabaseClient = import("@supabase/supabase-js").SupabaseClient<
  import("@/integrations/supabase/types").Database
>;

/** Shared loader for the project list with task and member counts (RLS-filtered). */
async function fetchProjectSummaries(
  supabase: SupabaseClient,
): Promise<ProjectSummary[]> {
  const { data: rows, error } = await supabase
    .from("projects")
    .select(
      "id, name, description, status, owner_id, created_at, owner:profiles!owner_id(full_name, email)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load projects");

  const ids = (rows ?? []).map((row) => row.id);
  const [tasksResult, membersResult] = ids.length
    ? await Promise.all([
        supabase.from("tasks").select("project_id, status").in("project_id", ids),
        supabase.from("project_members").select("project_id, user_id").in("project_id", ids),
      ])
    : [{ data: [] as { project_id: string; status: string }[] | null, error: null },
       { data: [] as { project_id: string; user_id: string }[] | null, error: null }];
  if (tasksResult.error || membersResult.error) {
    throw new Error("Could not load project details");
  }

  const counts = new Map<string, { todo: number; in_progress: number; done: number }>();
  for (const task of tasksResult.data ?? []) {
    const entry = counts.get(task.project_id) ?? { todo: 0, in_progress: 0, done: 0 };
    if (task.status === "todo") entry.todo += 1;
    else if (task.status === "in_progress") entry.in_progress += 1;
    else if (task.status === "done") entry.done += 1;
    counts.set(task.project_id, entry);
  }
  const memberCounts = new Map<string, number>();
  for (const member of membersResult.data ?? []) {
    memberCounts.set(member.project_id, (memberCounts.get(member.project_id) ?? 0) + 1);
  }

  return (rows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status as ProjectStatus,
    owner_id: row.owner_id,
    created_at: row.created_at,
    owner_name: row.owner?.full_name ?? null,
    owner_email: row.owner?.email ?? null,
    task_counts: counts.get(row.id) ?? { todo: 0, in_progress: 0, done: 0 },
    member_count: memberCounts.get(row.id) ?? 0,
  }));
}

/** Projects the signed-in user can see: own, member of, or (admins) everything. */
export const listProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProjectSummary[]> =>
    fetchProjectSummaries(context.supabase),
  );

export const getDashboardData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DashboardData> => {
    const projects = await fetchProjectSummaries(context.supabase);
    const { data: tasks, error } = await context.supabase
      .from("tasks")
      .select(
        "id, project_id, title, description, status, assignee_id, created_at, assignee:profiles!assignee_id(full_name)",
      )
      .eq("assignee_id", context.userId)
      .neq("status", "done")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load your tasks");
    return {
      projects,
      myTasks: (tasks ?? []).map((task) => ({
        id: task.id,
        project_id: task.project_id,
        title: task.title,
        description: task.description,
        status: task.status as TaskStatus,
        assignee_id: task.assignee_id,
        created_at: task.created_at,
        assignee_name: task.assignee?.full_name ?? null,
      })),
    };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; description: string }) => input)
  .handler(async ({ data, context }) => {
    const name = (data.name ?? "").trim();
    if (!name) throw new Error("Project name is required");
    const { data: project, error } = await context.supabase
      .from("projects")
      .insert({ name, description: (data.description ?? "").trim(), owner_id: context.userId })
      .select("id, name, description, status, owner_id, created_at")
      .single();
    if (error || !project) throw new Error("Could not create the project");
    return project;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { projectId: string; name?: string; description?: string; status?: ProjectStatus }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, string> = {};
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new Error("Project name is required");
      patch["name"] = name;
    }
    if (data.description !== undefined) patch["description"] = data.description.trim();
    if (data.status !== undefined) {
      if (data.status !== "active" && data.status !== "archived") {
        throw new Error("Invalid project status");
      }
      patch["status"] = data.status;
    }
    if (Object.keys(patch).length === 0) return { ok: true as const };

    const { error } = await context.supabase
      .from("projects")
      .update(patch)
      .eq("id", data.projectId);
    if (error) {
      throw new Error("Only the project owner or an administrator can update this project");
    }
    return { ok: true as const };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.projectId);
    if (error) {
      throw new Error("Only the project owner or an administrator can delete this project");
    }
    return { ok: true as const };
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<ProjectDetail> => {
    const { supabase } = context;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(
        "id, name, description, status, owner_id, created_at, owner:profiles!owner_id(full_name, email)",
      )
      .eq("id", data.projectId)
      .maybeSingle();
    if (projectError || !project) {
      throw new Error("Project not found or you do not have access");
    }

    const [membersResult, tasksResult] = await Promise.all([
      supabase
        .from("project_members")
        .select("user_id, created_at, profile:profiles!user_id(full_name, email, is_active)")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("tasks")
        .select(
          "id, project_id, title, description, status, assignee_id, created_at, assignee:profiles!assignee_id(full_name)",
        )
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: true }),
    ]);
    if (membersResult.error || tasksResult.error) {
      throw new Error("Could not load the project");
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status as ProjectStatus,
        owner_id: project.owner_id,
        created_at: project.created_at,
        owner_name: project.owner?.full_name ?? null,
        owner_email: project.owner?.email ?? null,
      },
      members: (membersResult.data ?? [])
        .filter((member) => member.profile)
        .map((member) => ({
          user_id: member.user_id,
          full_name: member.profile?.full_name ?? "",
          email: member.profile?.email ?? "",
          is_active: member.profile?.is_active ?? true,
          added_at: member.created_at,
        })),
      tasks: (tasksResult.data ?? []).map((task) => ({
        id: task.id,
        project_id: task.project_id,
        title: task.title,
        description: task.description,
        status: task.status as TaskStatus,
        assignee_id: task.assignee_id,
        created_at: task.created_at,
        assignee_name: task.assignee?.full_name ?? null,
      })),
    };
  });

/** Registered users for the member picker — admins and project owners only. */
export const listDirectoryUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DirectoryUser[]> => {
    const { supabase, userId } = context;
    const [adminResult, ownerResult] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "project_owner" }),
    ]);
    if (adminResult.error || ownerResult.error) {
      throw new Error("Could not verify your role");
    }
    if (!adminResult.data && !ownerResult.data) {
      throw new Error("Forbidden: only administrators and project owners can browse users");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, is_active")
      .order("full_name", { ascending: true });
    if (error) throw new Error("Could not load the user directory");
    return data ?? [];
  });

export const addMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // The project must be visible to the caller (RLS) before anything else.
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project) throw new Error("Project not found or you do not have access");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id, is_active")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) throw new Error("User not found");
    if (!target.is_active) throw new Error("That account is deactivated");
    if (data.userId !== userId && data.userId !== project.owner_id) {
      // RLS also enforces this on insert; fail fast with a clear message.
    }

    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: data.projectId, user_id: data.userId, added_by: userId });
    if (error) {
      if (error.code === "23505") throw new Error("That user is already a member");
      throw new Error("Only the project owner or an administrator can add members");
    }
    return { ok: true as const };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; userId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("project_members")
      .delete()
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId);
    if (error) {
      throw new Error("Only the project owner or an administrator can remove members");
    }
    return { ok: true as const };
  });

/** Assignee must belong to the project (owner or member). */
async function validateAssignee(
  supabase: SupabaseClient,
  projectId: string,
  assigneeId: string,
) {
  const [ownerResult, memberResult] = await Promise.all([
    supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle(),
    supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("user_id", assigneeId)
      .maybeSingle(),
  ]);
  const isOwner = ownerResult.data?.owner_id === assigneeId;
  const isMember = Boolean(memberResult.data);
  if (!isOwner && !isMember) {
    throw new Error("Assignee must be the project owner or a project member");
  }
}

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { projectId: string; title: string; description: string; assigneeId?: string }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const title = (data.title ?? "").trim();
    if (!title) throw new Error("Task title is required");

    const { data: project } = await context.supabase
      .from("projects")
      .select("id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project) throw new Error("Project not found or you do not have access");

    if (data.assigneeId) {
      await validateAssignee(context.supabase, data.projectId, data.assigneeId);
    }

    const { error } = await context.supabase.from("tasks").insert({
      project_id: data.projectId,
      title,
      description: (data.description ?? "").trim(),
      assignee_id: data.assigneeId || null,
      created_by: context.userId,
    });
    if (error) throw new Error("Could not create the task");
    return { ok: true as const };
  });

export const updateTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      taskId: string;
      title?: string;
      description?: string;
      status?: TaskStatus;
      assigneeId?: string | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: task } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", data.taskId)
      .maybeSingle();
    if (!task) throw new Error("Task not found or you do not have access");

    const patch: Record<string, string | null> = {};
    if (data.title !== undefined) {
      const title = data.title.trim();
      if (!title) throw new Error("Task title is required");
      patch["title"] = title;
    }
    if (data.description !== undefined) patch["description"] = data.description.trim();
    if (data.status !== undefined) {
      if (!["todo", "in_progress", "done"].includes(data.status)) {
        throw new Error("Invalid task status");
      }
      patch["status"] = data.status;
    }
    if (data.assigneeId !== undefined) {
      if (data.assigneeId) {
        await validateAssignee(supabase, task.project_id, data.assigneeId);
        patch["assignee_id"] = data.assigneeId;
      } else {
        patch["assignee_id"] = null;
      }
    }
    if (Object.keys(patch).length === 0) return { ok: true as const };

    const { error } = await supabase.from("tasks").update(patch).eq("id", data.taskId);
    if (error) throw new Error("Could not update the task");
    return { ok: true as const };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { taskId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.taskId);
    if (error) throw new Error("Could not delete the task");
    return { ok: true as const };
  });
