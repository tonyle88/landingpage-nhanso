import type { Metadata } from "next";
import { connection } from "next/server";
import QuizExperience from "./quiz-experience";
import { getPublicPackages } from "@/lib/supabase/public-packages";
import { getPublicQuizQuestions } from "@/lib/supabase/public-quiz-questions";

export const metadata: Metadata = {
  title: "Quiz chọn gói tư vấn phù hợp | Clow Cat Patronus",
  description: "Trả lời bộ câu hỏi chuyên sâu để tìm gói tư vấn nhân số học phù hợp với nhu cầu hiện tại của bạn.",
  alternates: { canonical: "/quiz" },
};

export default async function QuizPage() {
  await connection();
  const [{ packages }, questions] = await Promise.all([
    getPublicPackages(),
    getPublicQuizQuestions(),
  ]);

  return (
    <>
      <link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" />
      <QuizExperience packages={packages} questions={questions} />
    </>
  );
}
