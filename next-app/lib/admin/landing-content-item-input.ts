import { landingPlainText } from "@/lib/landing-text";

const ALLOWED_TYPES = new Set([
  "text", "html", "attr", "attribute", "placeholder", "href", "src", "alt", "aria-label",
]);

export function landingContentPayloadFromForm(form: FormData) {
  const key = String(form.get("key") || "").trim().toLowerCase();
  const description = String(form.get("description") || "").trim();
  const selector = String(form.get("selector") || "").trim();
  const attribute = String(form.get("attribute") || "").trim();
  const type = String(form.get("type") || "text").trim().toLowerCase();
  const rawValue = String(form.get("value") || "").replace(/\u2726/g, "").trim();

  if (!/^landing\.content\.[a-z0-9][a-z0-9._-]{1,100}$/.test(key)) throw new Error("invalid key");
  if (!selector || selector.length > 500) throw new Error("invalid selector");
  if (!ALLOWED_TYPES.has(type)) throw new Error("invalid type");
  if (attribute.length > 100 || description.length > 500 || rawValue.length > 100_000) {
    throw new Error("invalid content");
  }

  const value = type === "text" ? landingPlainText(rawValue) : rawValue;
  return {
    key,
    payload: {
      value: { value, selector, type, attribute, enabled: form.get("enabled") === "on" },
      description,
      is_public: true,
    },
  };
}
