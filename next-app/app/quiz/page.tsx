import type { Metadata } from "next";
import { connection } from "next/server";
import QuizExperience from "./quiz-experience";
import { getPublicPackages } from "@/lib/supabase/public-packages";
import { getPublicQuizQuestions } from "@/lib/supabase/public-quiz-questions";
import { getPublicQuizHubContent } from "@/lib/supabase/public-quiz-hub-content";

export const metadata: Metadata = {
  title: "Quiz & công cụ hiểu mình | Clow Cat Patronus",
  description: "Quiz chọn gói tư vấn, VAKAd, Ngôn ngữ yêu thương và Bánh xe cuộc đời với biểu đồ cùng luận giải trực quan.",
  alternates: { canonical: "/quiz" },
};

export default async function QuizPage() {
  await connection();
  const [{ packages }, questions, hubContent] = await Promise.all([
    getPublicPackages(),
    getPublicQuizQuestions(),
    getPublicQuizHubContent(),
  ]);

  return (
    <>
      <link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" />
      <QuizExperience packages={packages} questions={questions} mode="hub" hubContent={hubContent} />
    </>
  );
}
