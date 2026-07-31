import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PRODUCTION_SUPABASE_URL } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

type CookieMutation = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.nextUrl.host) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let payload: { email?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!email || !password) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const cookieMutations: CookieMutation[] = [];
  const cacheHeaders: Record<string, string> = {};
  const supabase = createServerClient<Database>(
    PRODUCTION_SUPABASE_URL,
    publishableKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookieMutations.push(...cookiesToSet);
          Object.assign(cacheHeaders, headers);
        },
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  const response = NextResponse.json(
    { ok: !error },
    { status: error ? 401 : 200 },
  );
  cookieMutations.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  Object.entries(cacheHeaders).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  return response;
}
