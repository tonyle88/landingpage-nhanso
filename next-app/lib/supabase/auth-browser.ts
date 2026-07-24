"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createAuthBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase Auth is not configured");
  }
  return createBrowserClient<Database>(url, publishableKey);
}
