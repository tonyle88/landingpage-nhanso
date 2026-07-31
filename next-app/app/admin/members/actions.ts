"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { memberInvitePayloadFromForm } from "@/lib/admin/member-input";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createServiceServerClient } from "@/lib/supabase/server";

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
