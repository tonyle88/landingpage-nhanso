import type { Metadata } from "next";
import { connection } from "next/server";
import QuizExperience from "../quiz-experience";
import { getPublicPackages } from "@/lib/supabase/public-packages";
import { getPublicQuizQuestions } from "@/lib/supabase/public-quiz-questions";

export const metadata: Metadata = {
  title: "Trắc nghiệm chọn gói tư vấn | Clow Cat Patronus",
  description: "Trả lời các câu hỏi chuyên sâu để nhận gợi ý gói tư vấn phù hợp với nhu cầu hiện tại.",
  alternates: { canonical: "/quiz/chon-goi" },
};

export default async function PackageQuizPage() {
  await connection();
  const [{ packages }, questions] = await Promise.all([
    getPublicPackages(),
    getPublicQuizQuestions(),
  ]);

  return (
    <>
      <link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" />
      <QuizExperience packages={packages} questions={questions} mode="assessment" />
    </>
  );
}
