import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

function createContentSecurityPolicy(nonce: string, isLoopback: boolean) {
  const isDevelopment = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      isDevelopment ? "'unsafe-eval'" : "",
    ]
      .filter(Boolean)
      .join(" "),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    [
      "img-src 'self' data: blob:",
      "https://i.ibb.co",
      "https://api.imgbb.com",
      "https://drive.google.com",
      "https://*.googleusercontent.com",
      "https://img.vietqr.io",
      "https://qr.sepay.vn",
    ].join(" "),
    [
      "connect-src 'self'",
      "https://script.google.com",
      "https://script.googleusercontent.com",
      "https://api.imgbb.com",
      "https://*.supabase.co",
    ].join(" "),
    "frame-src https://www.youtube.com",
    "media-src 'self'",
    "form-action 'self'",
    isLoopback ? "" : "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].filter(Boolean).join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isLoopback =
    request.nextUrl.hostname === "127.0.0.1" ||
    request.nextUrl.hostname === "localhost";
  const contentSecurityPolicy = createContentSecurityPolicy(nonce, isLoopback);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (
    request.nextUrl.pathname.startsWith("/admin") &&
    supabaseUrl &&
    publishableKey
  ) {
    const supabase = createServerClient<Database>(
      supabaseUrl,
      publishableKey,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(cookiesToSet, cacheHeaders) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request: { headers: requestHeaders },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
            Object.entries(cacheHeaders).forEach(([name, value]) =>
              response.headers.set(name, value),
            );
          },
        },
      },
    );
    // getClaims validates the signed token; getSession must not gate access.
    await supabase.auth.getClaims();
  }

  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|assets|style.css|blog.js|nhac.mp3).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
