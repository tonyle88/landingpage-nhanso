import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PRODUCTION_SUPABASE_URL } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import {
  classifyAuthLoginError,
  type LoginFeedbackCode,
} from "@/lib/auth/login-feedback";

type CookieMutation = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

function jsonResponse(
  body: { ok: boolean; code?: LoginFeedbackCode },
  status: number,
) {
  const response = NextResponse.json(body, { status });
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Expires", "0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function hasValidOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) {
    return jsonResponse({ ok: false, code: "invalid_request" }, 403);
  }

  let payload: { email?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, code: "invalid_request" }, 400);
  }
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!email || !password) {
    return jsonResponse({ ok: false, code: "invalid_request" }, 400);
  }

  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return jsonResponse({ ok: false, code: "service_unavailable" }, 503);
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
  let error: { code?: string; status?: number } | null;
  try {
    const result = await supabase.auth.signInWithPassword({ email, password });
    error = result.error;
  } catch {
    return jsonResponse({ ok: false, code: "service_unavailable" }, 503);
  }
  const failure = error ? classifyAuthLoginError(error) : null;
  const response = failure
    ? jsonResponse({ ok: false, code: failure.code }, failure.status)
    : jsonResponse({ ok: true }, 200);
  cookieMutations.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  Object.entries(cacheHeaders).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  return response;
}
