"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { parseQuizQuestions, QUIZ_SETTING_KEY } from "@/lib/quiz-question-schema";
import { parseQuizHubContent, QUIZ_HUB_SETTING_KEY } from "@/lib/quiz-hub-content";
import {
  LIFE_WHEEL_SETTING_KEY,
  LOVE_LANGUAGE_SETTING_KEY,
  parseLoveLanguageQuestions,
  parseVakadQuestions,
  parseWheelCategories,
  VAKAD_SETTING_KEY,
} from "@/lib/self-discovery-tools";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import type { Json } from "@/lib/supabase/database.types";

type ToolSaveConfig = {
  field: string;
  key: string;
  description: string;
  invalidStatus: string;
  errorStatus: string;
  savedStatus: string;
  valueField: "questions" | "categories";
  parse: (value: unknown) => unknown[] | null;
  publicPath: string;
};

async function saveToolQuestions(form: FormData, config: ToolSaveConfig) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) redirect("/admin/login?reason=unauthorized");

  let content: unknown[] | null = null;
  try {
    const raw = String(form.get(config.field) || "");
    if (!raw || raw.length > 300_000) throw new Error("tool payload invalid");
    content = config.parse(JSON.parse(raw));
    if (!content) throw new Error("tool content invalid");
  } catch {
    redirect(`/admin/quiz?status=${config.invalidStatus}`);
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_site_setting", {
    p_key: config.key,
    p_payload: {
      value: { [config.valueField]: content },
      description: config.description,
      is_public: true,
    } as Json,
  });
  if (error) {
    console.error("admin_save_self_discovery_questions failed", { key: config.key, code: error.code, message: error.message });
    redirect(`/admin/quiz?status=${config.errorStatus}`);
  }

  revalidatePath("/admin/quiz");
  revalidatePath(config.publicPath);
  redirect(`/admin/quiz?status=${config.savedStatus}`);
}

export async function saveQuizQuestionsAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) {
    redirect("/admin/login?reason=unauthorized");
  }

  let questions;
  try {
    const rawQuestions = String(form.get("questions") || "");
    if (rawQuestions.length > 200_000) throw new Error("quiz payload too large");
    questions = parseQuizQuestions(JSON.parse(rawQuestions));
    if (!questions) throw new Error("invalid quiz questions");
  } catch {
    redirect("/admin/quiz?status=invalid");
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_site_setting", {
    p_key: QUIZ_SETTING_KEY,
    p_payload: {
      value: { questions },
      description: "Bộ câu hỏi Quiz gợi ý gói tư vấn",
      is_public: true,
    },
  });
  if (error) {
    console.error("admin_save_quiz_questions failed", { code: error.code, message: error.message });
    redirect("/admin/quiz?status=error");
  }

  revalidatePath("/admin/quiz");
  revalidatePath("/quiz");
  redirect("/admin/quiz?status=saved");
}

export async function saveQuizHubContentAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) {
    redirect("/admin/login?reason=unauthorized");
  }

  const content = parseQuizHubContent({
    kicker: form.get("kicker"),
    titleBeforeAccent: form.get("titleBeforeAccent"),
    titleAccent: form.get("titleAccent"),
    intro: form.get("intro"),
    sectionKicker: form.get("sectionKicker"),
    sectionTitle: form.get("sectionTitle"),
    sectionDescription: form.get("sectionDescription"),
  });
  if (!content) redirect("/admin/quiz?status=invalid-hub");

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_site_setting", {
    p_key: QUIZ_HUB_SETTING_KEY,
    p_payload: {
      value: { content },
      description: "Tiêu đề và nội dung trang kho Quiz",
      is_public: true,
    },
  });
  if (error) {
    console.error("admin_save_quiz_hub_content failed", { code: error.code, message: error.message });
    redirect("/admin/quiz?status=error-hub");
  }

  revalidatePath("/admin/quiz");
  revalidatePath("/quiz");
  redirect("/admin/quiz?status=saved-hub");
}

export async function saveVakadQuestionsAction(form: FormData) {
  return saveToolQuestions(form, {
    field: "vakadQuestions", key: VAKAD_SETTING_KEY, valueField: "questions",
    description: "Bộ câu hỏi công cụ VAKAd", parse: parseVakadQuestions,
    invalidStatus: "invalid-vakad", errorStatus: "error-vakad", savedStatus: "saved-vakad",
    publicPath: "/quiz/cong-cu/vakad",
  });
}

export async function saveLoveLanguageQuestionsAction(form: FormData) {
  return saveToolQuestions(form, {
    field: "loveQuestions", key: LOVE_LANGUAGE_SETTING_KEY, valueField: "questions",
    description: "Bộ câu hỏi công cụ Ngôn ngữ yêu thương", parse: parseLoveLanguageQuestions,
    invalidStatus: "invalid-love", errorStatus: "error-love", savedStatus: "saved-love",
    publicPath: "/quiz/cong-cu/ngon-ngu-yeu-thuong",
  });
}

export async function saveLifeWheelQuestionsAction(form: FormData) {
  return saveToolQuestions(form, {
    field: "wheelCategories", key: LIFE_WHEEL_SETTING_KEY, valueField: "categories",
    description: "Bộ câu hỏi công cụ Bánh xe cuộc đời", parse: parseWheelCategories,
    invalidStatus: "invalid-wheel", errorStatus: "error-wheel", savedStatus: "saved-wheel",
    publicPath: "/quiz/cong-cu/banh-xe-cuoc-doi",
  });
}
