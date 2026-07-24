import { headers } from "next/headers";
import { connection } from "next/server";
import {
  AboutSection,
  BenefitsSection,
  ContactSection,
  FaqSection,
  HeroSection,
  LandingFooter,
  LandingNavbar,
  LandingPreamble,
  MethodsSection,
  MiniReportSection,
  PackageComparisonSection,
  PackagesSection,
  PainPointsSection,
  ProcessSection,
  TestimonialsSection,
} from "@/components/landing/landing-sections";
import BookingFlow from "@/components/landing/booking-flow";
import LandingUtilities from "@/components/landing/landing-utilities";
import LandingRuntime from "./landing-runtime";
import { getPublicPackages } from "@/lib/supabase/public-packages";
import { getPublicTestimonials } from "@/lib/supabase/public-testimonials";
import { getPublicLandingContent } from "@/lib/supabase/public-landing-content";

export default async function LandingPage() {
  await connection();
  const [
    requestHeaders,
    publicPackages,
    publicTestimonials,
    publicLandingContent,
  ] = await Promise.all([
    headers(),
    getPublicPackages(),
    getPublicTestimonials(),
    getPublicLandingContent(),
  ]);
  const nonce = requestHeaders.get("x-nonce") || undefined;

  return (
    <>
      <link rel="preconnect" href="https://script.google.com" />
      <link rel="preconnect" href="https://script.googleusercontent.com" />
      <link rel="preconnect" href="https://i.ibb.co" />
      <link
        rel="preload"
        href="/assets/images/hero_bg.webp"
        as="image"
        type="image/webp"
        fetchPriority="high"
      />
      <link rel="stylesheet" href="/assets/vendor/fonts/fonts.css" />
      <link
        rel="stylesheet"
        href="/assets/vendor/fontawesome/css/all.min.css"
      />
      <link rel="stylesheet" href="/style.css" />

      <LandingRuntime
        initialPackages={publicPackages.packages}
        initialTestimonials={publicTestimonials.testimonials}
        initialLandingContent={publicLandingContent.content}
        preferSupabaseLandingItems={publicLandingContent.hasItems}
        preferSupabaseLandingSections={publicLandingContent.hasSections}
      />
      <div className="landing-page-root">
        <LandingPreamble />
        <LandingNavbar />
        <HeroSection />
        <main
          id="dynamic-layout"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <PainPointsSection />
          <MiniReportSection />
          <AboutSection />
          <BenefitsSection />
          <TestimonialsSection />
          <PackagesSection />
          <PackageComparisonSection />
          <MethodsSection />
          <ProcessSection />
          <FaqSection />
          <ContactSection />
        </main>
        <BookingFlow />
        <LandingFooter />
        <LandingUtilities />
      </div>

      <script
        src="/assets/vendor/dompurify/purify.min.js"
        nonce={nonce}
        defer
      />
      <script src="/assets/js/sanitize-html.js" nonce={nonce} defer />
      <script src="/script.js" nonce={nonce} defer />
    </>
  );
}
