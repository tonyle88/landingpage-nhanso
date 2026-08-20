import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  isSelfDiscoveryToolSlug,
  SELF_DISCOVERY_TOOLS,
} from "@/lib/self-discovery-tools";
import { getPublicSelfDiscoveryContent } from "@/lib/supabase/public-self-discovery-tools";
import ToolExperience from "./tool-experience";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = SELF_DISCOVERY_TOOLS.find((item) => item.slug === slug);
  if (!tool) return {};
  return {
    title: `${tool.title} | Clow Cat Patronus`,
    description: `${tool.subtitle}. Làm bài trực tuyến, xem biểu đồ và phần luận giải ngay sau khi hoàn thành.`,
    alternates: { canonical: `/quiz/cong-cu/${tool.slug}` },
  };
}

export default async function SelfDiscoveryToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // A per-request render lets Next apply the CSP nonce to its client scripts.
  // Static prerendering would leave the assessment visible but non-interactive.
  await connection();
  const { slug } = await params;
  if (!isSelfDiscoveryToolSlug(slug)) notFound();

  if (slug === "vakad") {
    const content = await getPublicSelfDiscoveryContent(slug);
    return <><link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" /><ToolExperience slug={slug} content={content} /></>;
  }
  if (slug === "ngon-ngu-yeu-thuong") {
    const content = await getPublicSelfDiscoveryContent(slug);
    return <><link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" /><ToolExperience slug={slug} content={content} /></>;
  }
  const content = await getPublicSelfDiscoveryContent(slug);

  return (
    <>
      <link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" />
      <ToolExperience slug={slug} content={content} />
    </>
  );
}
