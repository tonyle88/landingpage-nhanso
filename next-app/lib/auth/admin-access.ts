import "server-only";

import { redirect } from "next/navigation";
import { getAdminPrincipal, type AdminPrincipal } from "./admin-principal";
import { can, type AdminPermission } from "./roles";

/**
 * Chặn Server Action trước khi đọc/ghi dữ liệu nếu phiên hiện tại thiếu quyền.
 * Dùng cho các thao tác quản trị nội dung và cấu hình vận hành.
 * @param permission Quyền nghiệp vụ bắt buộc, tra theo bảng ROLE_PERMISSIONS.
 * @returns Danh tính đã xác thực để ghi người tạo/sửa hoặc gán chủ sở hữu file.
 * Nếu chưa đăng nhập hoặc thiếu quyền, redirect kết thúc action ngay lập tức.
 * Không cache danh tính giữa các request; RPC và RLS vẫn phải kiểm tra quyền ở DB.
 */
export async function requireAdminPermission(
  permission: AdminPermission,
): Promise<AdminPrincipal> {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, permission)) {
    redirect("/admin/login?reason=unauthorized");
  }
  return principal;
}

/**
 * Lối vào dùng chung cho action sửa gói, blog, feedback, bố cục và cấu hình nội dung.
 * Trả principal cho các action cần userId; chỉ cho phép quyền manage_content.
 * Không dùng helper này cho đối soát thanh toán hoặc quản lý tài khoản thành viên.
 */
export async function requireContentManager(): Promise<AdminPrincipal> {
  return requireAdminPermission("manage_content");
}
