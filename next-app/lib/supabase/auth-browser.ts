"use client";

import { createBrowserClient } from "@supabase/ssr";
import { PRODUCTION_SUPABASE_URL } from "./config";
import type { Database } from "./database.types";

export function createAuthBrowserClient() {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("Supabase Auth is not configured");
  }
  return createBrowserClient<Database>(
    PRODUCTION_SUPABASE_URL,
    publishableKey,
  );
}
