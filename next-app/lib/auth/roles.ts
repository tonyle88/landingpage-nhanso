export const ADMIN_ROLES = ["owner", "admin", "editor", "auditor"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminPermission =
  | "manage_roles"
  | "manage_content"
  | "manage_operations"
  | "read_operations"
  | "read_audit";

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  owner: [
    "manage_roles",
    "manage_content",
    "manage_operations",
    "read_operations",
    "read_audit",
  ],
  admin: [
    "manage_content",
    "manage_operations",
    "read_operations",
    "read_audit",
  ],
  editor: ["manage_content"],
  auditor: ["read_operations", "read_audit"],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return (
    typeof value === "string" &&
    (ADMIN_ROLES as readonly string[]).includes(value)
  );
}

export function can(
  role: AdminRole | null,
  permission: AdminPermission,
): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}
