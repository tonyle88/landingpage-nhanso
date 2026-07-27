import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PRODUCTION_SUPABASE_URL } from "./config";
import type { Database } from "./database.types";

export async function createAuthServerClient() {
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error("Supabase Auth is not configured");
  }

  const cookieStore = await cookies();
  return createServerClient<Database>(
    PRODUCTION_SUPABASE_URL,
    publishableKey,
    {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. The request Proxy refreshes
          // sessions before protected components render.
        }
      },
    },
    },
  );
}
