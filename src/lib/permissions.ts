/**
 * Pure role helpers shared by the UI. These drive what the interface shows;
 * the database RLS policies and the server-side role checks are the real
 * security boundary — the UI can only hide controls, never grant access.
 */
export type AppRoleName = "admin" | "project_owner" | "user";

export type AssignableRole = "project_owner" | "user";

export const ROLE_LABELS: Record<AppRoleName, string> = {
  admin: "Administrator",
  project_owner: "Project Owner",
  user: "Standard User",
};

export function isAdmin(roles: string[]): boolean {
  return roles.includes("admin");
}

export function isProjectOwner(roles: string[]): boolean {
  return roles.includes("project_owner");
}

/** Admins manage users; nobody else can view or change the user directory. */
export function canManageUsers(roles: string[]): boolean {
  return isAdmin(roles);
}

/** Roles an administrator may assign: Project Owner or Standard User — never admin. */
export function assignableRoles(): AssignableRole[] {
  return ["project_owner", "user"];
}

/** The signed-in user may manage a project they own, or as an administrator. */
export function canManageProject(
  roles: string[],
  ownerId: string,
  userId: string,
): boolean {
  return ownerId === userId || isAdmin(roles);
}

export function describeRoles(roles: string[]): string {
  if (roles.length === 0) return "No role assigned";
  return roles.map((role) => ROLE_LABELS[role as AppRoleName] ?? role).join(", ");
}
