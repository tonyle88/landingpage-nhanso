import type { Json } from "@/lib/supabase/database.types";

export function settingPayloadFromForm(form: FormData) {
  const key = String(form.get("key") || "").trim().toLowerCase();
  const description = String(form.get("description") || "").trim();
  const rawValue = String(form.get("value") || "").trim();
  if (!/^[a-z0-9][a-z0-9._-]{1,119}$/.test(key)) throw new Error("invalid key");
  if (description.length > 500) throw new Error("invalid description");
  if (!rawValue || rawValue.length > 100_000) throw new Error("invalid value");
  let value: Json;
  try {
    value = JSON.parse(rawValue) as Json;
  } catch {
    throw new Error("invalid JSON");
  }
  return {
    key,
    payload: {
      value,
      description,
      is_public: form.get("is_public") === "on",
    },
  };
}
