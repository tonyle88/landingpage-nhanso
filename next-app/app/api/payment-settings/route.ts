import { NextResponse } from "next/server";
import { createServiceServerClient } from "@/lib/supabase/server";

const SEPAY_SETTING_KEY = "payments.sepay_auto_confirmation";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceServerClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Payment settings are unavailable." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", SEPAY_SETTING_KEY)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { ok: false, message: "Payment settings are unavailable." },
      { status: 503 },
    );
  }

  const value = data.value;
  const sepayEnabled = Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "enabled" in value &&
      value.enabled === true,
  );

  return NextResponse.json(
    { ok: true, sepayEnabled },
    { headers: { "Cache-Control": "no-store" } },
  );
}
