"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { parseQuizQuestions, QUIZ_SETTING_KEY } from "@/lib/quiz-question-schema";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

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
