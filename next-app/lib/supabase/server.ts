import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PRODUCTION_SUPABASE_URL } from "./config";
import type { Database } from "./database.types";

export function createPublicServerClient(): SupabaseClient<Database> | null {
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!publishableKey) return null;

  return createClient<Database>(PRODUCTION_SUPABASE_URL, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createServiceServerClient(): SupabaseClient<Database> | null {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!secretKey) return null;

  return createClient<Database>(PRODUCTION_SUPABASE_URL, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
