import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can, type AdminRole } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServiceServerClient } from "@/lib/supabase/server";
import { AdminToast } from "../admin-toast";
import styles from "../admin.module.css";
import {
  inviteMemberAction,
  resendMemberSetupAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý thành viên | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  invited: "Đã tạo thành viên và gửi email mời đặt mật khẩu.",
  resent: "Đã gửi lại liên kết đặt mật khẩu cho thành viên.",
  invalid: "Họ tên, email hoặc vai trò chưa hợp lệ.",
  exists: "Email này đã là thành viên có phân quyền. Không tạo bản ghi trùng lặp.",
  delivery: "Chưa thể gửi email mời lúc này. Vui lòng thử lại sau.",
  config: "Máy chủ chưa có khóa quản trị Supabase để quản lý thành viên.",
  error: "Không thể tạo thành viên. Tài khoản chưa được xác nhận.",
};

const roleLabels: Record<AdminRole, string> = {
  owner: "Chủ sở hữu",
  admin: "Quản trị viên",
  editor: "Biên tập viên",
  auditor: "Kiểm tra viên",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeZone: "Asia/Ho_Chi_Minh",
});

function formatDate(value: string | undefined) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa có" : dateFormatter.format(date);
}

function getMemberStatus(
  user: User | undefined,
  authDirectoryAvailable: boolean,
) {
  if (!authDirectoryAvailable) {
    return {
      label: "Chưa đồng bộ trạng thái",
      className: styles.memberStatusPending,
    };
  }

  if (!user) {
    return {
      label: "Thiếu tài khoản",
      className: styles.memberStatusWarning,
    };
  }

  const bannedUntil = user.banned_until
    ? new Date(user.banned_until).getTime()
    : 0;
  if (bannedUntil > Date.now()) {
    return {
      label: "Đang tạm khóa",
      className: styles.memberStatusWarning,
    };
  }

  if (!user.last_sign_in_at) {
    return {
      label: "Đang chờ nhận lời",
      className: styles.memberStatusPending,
    };
  }

  return {
    label: "Đang hoạt động",
    className: styles.memberStatusActive,
  };
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_roles")) redirect("/admin");

  const authClient = await createAuthServerClient();
  const service = createServiceServerClient();
  const { status } = await searchParams;

  let loadError = false;
  let authDirectoryAvailable = Boolean(service);
  let members: Array<{
    userId: string;
    displayName: string;
    email: string;
    role: AdminRole;
    createdAt: string;
    lastSignInAt?: string;
    statusLabel: string;
    statusClassName: string;
  }> = [];

  const rolesResult = await authClient
    .from("admin_roles")
    .select("user_id, role, created_at")
    .order("created_at", { ascending: true });
  const roleRows = rolesResult.data || [];
  const userIds = roleRows.map((row) => row.user_id);
  const profilesResult = userIds.length
    ? await authClient
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds)
    : { data: [], error: null };

  let authUsers: User[] = [];
  if (service) {
    const usersResult = await service.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersResult.error) {
      authDirectoryAvailable = false;
    } else {
      authUsers = usersResult.data.users;
    }
  }

  loadError = Boolean(rolesResult.error || profilesResult.error);
  const profilesById = new Map(
    (profilesResult.data || []).map((profile) => [profile.id, profile]),
  );
  const usersById = new Map(authUsers.map((user) => [user.id, user]));

  members = roleRows.map((roleRow) => {
    const user = usersById.get(roleRow.user_id);
    const memberStatus = getMemberStatus(
      user,
      authDirectoryAvailable,
    );
    return {
      userId: roleRow.user_id,
      displayName:
        profilesById.get(roleRow.user_id)?.display_name ||
        "Chưa cập nhật tên",
      email:
        user?.email ||
        (roleRow.user_id === principal.userId
          ? principal.email || "Email được bảo vệ"
          : "Email được bảo vệ"),
      role: roleRow.role,
      createdAt: roleRow.created_at,
      lastSignInAt: user?.last_sign_in_at,
      statusLabel: memberStatus.label,
      statusClassName: memberStatus.className,
    };
  });

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · Thành viên</p>
          <h1>Quản lý thành viên</h1>
          <p>Tạo tài khoản nội bộ và phân quyền theo đúng công việc.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">
          Tổng quan
        </Link>
      </header>

      <AdminToast
        message={status ? notices[status] : undefined}
        tone={
          ["invalid", "exists", "delivery", "config", "error"].includes(
            status || "",
          )
            ? "error"
            : "success"
        }
        cleanHref="/admin/members"
      />
      {loadError ? (
        <AdminToast
          message="Không thể đọc hồ sơ và phân quyền thành viên."
          tone="error"
          cleanHref="/admin/members"
        />
      ) : null}
      {!authDirectoryAvailable ? (
        <div className={styles.notice} role="status">
          Danh sách tên và vai trò vẫn được tải. Máy chủ chưa có quyền đọc
          email và trạng thái tài khoản từ Supabase Auth; cần bổ sung khóa
          quản trị Supabase trên môi trường đang chạy.
        </div>
      ) : null}

      <section className={`${styles.adminPanel} ${styles.memberInvitePanel}`}>
        <div className={styles.memberInviteIntro}>
          <p className={styles.eyebrow}>Mời thành viên mới</p>
          <h2>Tạo tài khoản an toàn</h2>
          <p>
            Thành viên sẽ nhận email để tự đặt mật khẩu. Mật khẩu không hiển
            thị và không được lưu trong trang quản trị.
          </p>
        </div>
        <form className={styles.memberInviteForm} action={inviteMemberAction}>
          <label className={styles.field}>
            Họ và tên
            <input
              name="display_name"
              minLength={2}
              maxLength={120}
              placeholder="Nguyễn Minh Anh"
              autoComplete="name"
              required
            />
          </label>
          <label className={styles.field}>
            Email đăng nhập
            <input
              name="email"
              type="email"
              maxLength={254}
              placeholder="minhanh@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className={styles.field}>
            Vai trò
            <select name="role" defaultValue="editor" required>
              <option value="admin">Quản trị viên</option>
              <option value="editor">Biên tập viên</option>
              <option value="auditor">Kiểm tra viên</option>
            </select>
          </label>
          <button
            className={styles.submit}
            type="submit"
            data-pending-label="Đang gửi lời mời thành viên…"
          >
            Tạo và gửi lời mời
          </button>
        </form>
        <div className={styles.memberRoleGuide} aria-label="Mô tả phân quyền">
          <span><strong>Quản trị viên</strong> Nội dung và vận hành</span>
          <span><strong>Biên tập viên</strong> Chỉ quản lý nội dung</span>
          <span><strong>Kiểm tra viên</strong> Chỉ xem vận hành và audit</span>
        </div>
      </section>

      <section className={styles.adminPanel}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Tài khoản nội bộ</p>
            <h2>Danh sách thành viên</h2>
          </div>
          <span>{members.length} thành viên</span>
        </div>

        <div className={styles.memberTable}>
          <div className={styles.memberTableHeader} aria-hidden="true">
            <span>Thành viên</span>
            <span>Vai trò</span>
            <span>Trạng thái</span>
            <span>Tham gia</span>
          </div>
          {members.map((member) => (
            <article className={styles.memberRow} key={member.userId}>
              <div className={styles.memberIdentity}>
                <span className={styles.memberAvatar} aria-hidden="true">
                  {member.displayName.slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>
                    {member.displayName}
                    {member.userId === principal.userId ? (
                      <em>Bạn</em>
                    ) : null}
                  </strong>
                  <small>{member.email}</small>
                </span>
              </div>
              <div className={styles.memberDatum}>
                <span>Vai trò</span>
                <strong>{roleLabels[member.role]}</strong>
              </div>
              <div className={styles.memberDatum}>
                <span>Trạng thái</span>
                <strong
                  className={`${styles.memberStatus} ${member.statusClassName}`}
                >
                  {member.statusLabel}
                </strong>
                {member.lastSignInAt ? (
                  <small>Đăng nhập {formatDate(member.lastSignInAt)}</small>
                ) : null}
                {member.userId !== principal.userId ? (
                  <form action={resendMemberSetupAction}>
                    <input type="hidden" name="user_id" value={member.userId} />
                    <button
                      className={styles.memberLinkButton}
                      type="submit"
                      data-pending-label="Đang gửi lại liên kết mật khẩu…"
                    >
                      Gửi lại link mật khẩu
                    </button>
                  </form>
                ) : null}
              </div>
              <div className={styles.memberDatum}>
                <span>Tham gia</span>
                <strong>{formatDate(member.createdAt)}</strong>
              </div>
            </article>
          ))}
          {!loadError && members.length === 0 ? (
            <p className={styles.memberEmpty}>
              Chưa có thành viên nào trong hệ thống.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
