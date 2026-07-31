"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { memberInvitePayloadFromForm } from "@/lib/admin/member-input";
import { optionalUuid } from "@/lib/admin/package-input";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createServiceServerClient } from "@/lib/supabase/server";

const DEFAULT_SITE_URL = "https://nhanso.clowcat.com.vn";

function getInviteRedirectUrl() {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  try {
    const siteUrl = new URL(configuredSiteUrl);
    const isLocalHttp =
      siteUrl.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(siteUrl.hostname);
    if (siteUrl.protocol !== "https:" && !isLocalHttp) {
      throw new Error("unsafe site URL");
    }
    return new URL("/admin/set-password", siteUrl).toString();
  } catch {
    return `${DEFAULT_SITE_URL}/admin/set-password`;
  }
}

async function requireRoleManager() {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_roles")) {
    redirect("/admin/login?reason=unauthorized");
  }
  return principal;
}

function inviteFailureStatus(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("already") ||
    normalized.includes("registered") ||
    normalized.includes("exists")
  ) {
    return "exists";
  }
  if (
    normalized.includes("rate") ||
    normalized.includes("limit") ||
    normalized.includes("email")
  ) {
    return "delivery";
  }
  return "error";
}

export async function inviteMemberAction(form: FormData) {
  const principal = await requireRoleManager();

  let payload;
  try {
    payload = memberInvitePayloadFromForm(form);
  } catch {
    redirect("/admin/members?status=invalid");
  }

  const service = createServiceServerClient();
  if (!service) redirect("/admin/members?status=config");
  const adminClient = service;

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(payload.email, {
      data: { display_name: payload.displayName },
      redirectTo: getInviteRedirectUrl(),
    });

  if (inviteError || !inviteData.user) {
    redirect(
      `/admin/members?status=${inviteFailureStatus(inviteError?.message || "")}`,
    );
  }

  const userId = inviteData.user.id;
  async function rollbackInvite() {
    await adminClient.from("admin_roles").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("id", userId);
    await adminClient.auth.admin.deleteUser(userId);
  }

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: userId,
      display_name: payload.displayName,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await rollbackInvite();
    redirect("/admin/members?status=error");
  }

  const { error: roleError } = await adminClient.from("admin_roles").insert({
    user_id: userId,
    role: payload.role,
    created_by: principal.userId,
  });

  if (roleError) {
    await rollbackInvite();
    redirect("/admin/members?status=error");
  }

  const { error: auditError } = await adminClient.from("audit_logs").insert({
    actor_id: principal.userId,
    actor_role: principal.role,
    action: "admin_member.invite",
    target_type: "admin_member",
    target_id: userId,
    status: "success",
    message: "Invited a new admin member.",
    after_data: {
      display_name: payload.displayName,
      email: payload.email,
      role: payload.role,
    },
  });

  if (auditError) {
    await rollbackInvite();
    redirect("/admin/members?status=error");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/members");
  redirect("/admin/members?status=invited");
}

export async function resendMemberSetupAction(form: FormData) {
  const principal = await requireRoleManager();
  let userId: string;
  try {
    userId = optionalUuid(form.get("user_id")) || "";
    if (!userId) throw new Error("missing user");
  } catch {
    redirect("/admin/members?status=invalid");
  }

  const service = createServiceServerClient();
  if (!service) redirect("/admin/members?status=config");

  const [roleResult, userResult] = await Promise.all([
    service
      .from("admin_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
    service.auth.admin.getUserById(userId),
  ]);
  const memberEmail = userResult.data.user?.email;
  if (
    roleResult.error ||
    !roleResult.data ||
    userResult.error ||
    !memberEmail
  ) {
    redirect("/admin/members?status=error");
  }

  const { error } = await service.auth.resetPasswordForEmail(memberEmail, {
    redirectTo: getInviteRedirectUrl(),
  });
  if (error) redirect("/admin/members?status=delivery");

  await service.from("audit_logs").insert({
    actor_id: principal.userId,
    actor_role: principal.role,
    action: "admin_member.setup_link_resend",
    target_type: "admin_member",
    target_id: userId,
    status: "success",
    message: "Resent the member password setup link.",
    after_data: {
      email: memberEmail,
      role: roleResult.data.role,
    },
  });

  redirect("/admin/members?status=resent");
}
