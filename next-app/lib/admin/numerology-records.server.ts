import "server-only";

import { NUMEROLOGY_HISTORY_LIMIT } from "./numerology-records";
import { createServiceServerClient } from "@/lib/supabase/server";

export const NUMEROLOGY_HISTORY_SETTING_KEY = "admin.numerology_history_limit";

function clampLimit(value: unknown) {
  const parsed = typeof value === "number"
    ? value
    : Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(Math.max(Math.round(parsed), 20), 1000);
}

export async function getNumerologyHistoryLimit() {
  const service = createServiceServerClient();
  if (service) {
    const { data } = await service
      .from("site_settings")
      .select("value")
      .eq("key", NUMEROLOGY_HISTORY_SETTING_KEY)
      .maybeSingle();
    const value = data?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const configuredInAdmin = clampLimit(
        "limit" in value ? value.limit : undefined,
      );
      if (configuredInAdmin) return configuredInAdmin;
    }
  }

  const configured = Number.parseInt(
    process.env.NUMEROLOGY_HISTORY_LIMIT || "",
    10,
  );
  return clampLimit(configured) || NUMEROLOGY_HISTORY_LIMIT;
}
