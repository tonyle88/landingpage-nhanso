import type { Json } from "@/lib/supabase/database.types";

export type PackagePayload = {
  code: string;
  name: string;
  online_price: string;
  offline_price: string;
  currency: string;
  unit: string;
  icon: string;
  accent_color: string;
  featured: boolean;
  badge: string;
  features: Json;
  button_text: string;
  enabled: boolean;
  sort_order: number;
};

function text(form: FormData, name: string, max: number) {
  return String(form.get(name) || "").trim().slice(0, max);
}

function price(form: FormData, name: string) {
  const value = text(form, name, 20);
  if (!value) return "";
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error("invalid price");
  }
  return value;
}

export function packagePayloadFromForm(form: FormData): PackagePayload {
  const code = text(form, "code", 64).toLowerCase();
  const name = text(form, "name", 160);
  const onlinePrice = price(form, "online_price");
  const offlinePrice = price(form, "offline_price");
  const currency = text(form, "currency", 3).toUpperCase() || "VND";
  const sortOrder = Number(text(form, "sort_order", 6) || "0");
  const features = text(form, "features", 4000)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((item) => item.slice(0, 200));

  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(code)) {
    throw new Error("invalid code");
  }
  if (name.length < 2) throw new Error("invalid name");
  if (!onlinePrice && !offlinePrice) throw new Error("missing price");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("invalid currency");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
    throw new Error("invalid sort order");
  }

  return {
    code,
    name,
    online_price: onlinePrice,
    offline_price: offlinePrice,
    currency,
    unit: text(form, "unit", 80),
    icon: text(form, "icon", 80),
    accent_color: text(form, "accent_color", 32),
    featured: form.get("featured") === "on",
    badge: text(form, "badge", 80),
    features,
    button_text: text(form, "button_text", 120),
    enabled: form.get("enabled") === "on",
    sort_order: sortOrder,
  };
}

export function optionalUuid(value: FormDataEntryValue | null) {
  const id = String(value || "").trim();
  if (!id) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("invalid id");
  }
  return id;
}
