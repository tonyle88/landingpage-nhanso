import type { AdminRole } from "@/lib/auth/roles";

export const INVITABLE_ADMIN_ROLES = [
  "admin",
  "editor",
  "auditor",
] as const satisfies readonly AdminRole[];

export type InvitableAdminRole = (typeof INVITABLE_ADMIN_ROLES)[number];

export type MemberInvitePayload = {
  displayName: string;
  email: string;
  role: InvitableAdminRole;
};

export function memberInvitePayloadFromForm(
  form: FormData,
): MemberInvitePayload {
  const displayName = String(form.get("display_name") || "")
    .trim()
    .replace(/\s+/g, " ");
  const email = String(form.get("email") || "").trim().toLowerCase();
  const role = String(form.get("role") || "");

  if (displayName.length < 2 || displayName.length > 120) {
    throw new Error("invalid display name");
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new Error("invalid email");
  }
  if (
    !(INVITABLE_ADMIN_ROLES as readonly string[]).includes(role)
  ) {
    throw new Error("invalid role");
  }

  return {
    displayName,
    email,
    role: role as InvitableAdminRole,
  };
}
