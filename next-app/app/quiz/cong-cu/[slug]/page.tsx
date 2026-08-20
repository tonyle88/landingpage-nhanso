import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  isSelfDiscoveryToolSlug,
  SELF_DISCOVERY_TOOLS,
  type SelfDiscoveryToolSlug,
} from "@/lib/self-discovery-tools";
import ToolExperience from "./tool-experience";

export function generateStaticParams() {
  return SELF_DISCOVERY_TOOLS.map(({ slug }) => ({ slug }));
}

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
  const { slug } = await params;
  if (!isSelfDiscoveryToolSlug(slug)) notFound();

  return (
    <>
      <link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" />
      <ToolExperience slug={slug as SelfDiscoveryToolSlug} />
    </>
  );
}
