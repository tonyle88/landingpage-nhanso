import "server-only";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { isAdminRole, type AdminRole } from "./roles";

export type AdminPrincipal = {
  userId: string;
  email: string | null;
  role: AdminRole;
};

export async function getAdminPrincipal(): Promise<AdminPrincipal | null> {
  const supabase = await createAuthServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId =
    typeof claims?.sub === "string" ? claims.sub : null;
  if (claimsError || !claims || !userId) return null;

  const { data: role, error: roleError } = await supabase.rpc(
    "current_admin_role",
  );
  if (roleError || !isAdminRole(role)) return null;

  return {
    userId,
    email:
      typeof claims.email === "string" ? claims.email : null,
    role,
  };
}
