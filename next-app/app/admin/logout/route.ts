import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PRODUCTION_SUPABASE_URL } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function POST(request: NextRequest) {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/login" },
  });
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (publishableKey) {
    const supabase = createServerClient<Database>(
      PRODUCTION_SUPABASE_URL,
      publishableKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(cookiesToSet, headers) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
            Object.entries(headers).forEach(([name, value]) =>
              response.headers.set(name, value),
            );
          },
        },
      },
    );
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // The explicit cookie cleanup below still ends the local admin session
      // when the remote sign-out request is temporarily unavailable.
    }
  }

  const projectRef = new URL(PRODUCTION_SUPABASE_URL).hostname.split(".")[0];
  const authCookiePrefix = `sb-${projectRef}-auth-token`;
  request.cookies.getAll()
    .filter(({ name }) => (
      name === authCookiePrefix
      || name.startsWith(`${authCookiePrefix}.`)
      || name === `${authCookiePrefix}-code-verifier`
    ))
    .forEach(({ name }) => {
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });
    });
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}
