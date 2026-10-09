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

/**
 * Kiểm tra giá trị RPC/claims có thuộc tập vai trò quản trị được hệ thống hỗ trợ.
 * Là type guard giúp caller chỉ dùng vai trò đã kiểm tra để tra bảng quyền.
 */
export function isAdminRole(value: unknown): value is AdminRole {
  return (
    typeof value === "string" &&
    (ADMIN_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Tra quyền nghiệp vụ của owner/admin/editor/auditor theo bảng ROLE_PERMISSIONS.
 * Trả false nếu không có vai trò; dùng cho UI và Server Actions.
 * Không thay thế RLS/RPC ở cơ sở dữ liệu và không tự xác thực phiên đăng nhập.
 */
export function can(
  role: AdminRole | null,
  permission: AdminPermission,
): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}
