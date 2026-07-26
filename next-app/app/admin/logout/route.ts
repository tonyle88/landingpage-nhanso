import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export async function POST() {
  const supabase = await createAuthServerClient();
  await supabase.auth.signOut({ scope: "local" });
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/login" },
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
