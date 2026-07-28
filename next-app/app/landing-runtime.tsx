"use client";

import { useEffect } from "react";
import { useBookingApiClient } from "./use-booking-api-client";
import { useBookingCalendar } from "./use-booking-calendar";
import { useBookingFormState } from "./use-booking-form-state";
import { useLandingContent } from "./use-landing-content";
import { useLandingEffects } from "./use-landing-effects";
import { useBackgroundMusic } from "./use-background-music";
import { useMiniReportContent } from "./use-mini-report-content";
import { usePackages } from "./use-packages";
import { usePaymentRuntime } from "./use-payment-runtime";
import { useTestimonials } from "./use-testimonials";
import type { PublicPackage } from "@/lib/packages";
import type { PublicTestimonial } from "@/lib/testimonials";
import type { PublicLandingContent } from "@/lib/landing-content";

type LandingRuntimeProps = {
  initialPackages?: PublicPackage[];
  initialTestimonials?: PublicTestimonial[];
  initialLandingContent?: PublicLandingContent;
  preferSupabaseLandingItems?: boolean;
  preferSupabaseLandingSections?: boolean;
};

export default function LandingRuntime({
  initialPackages = [],
  initialTestimonials = [],
  initialLandingContent,
  preferSupabaseLandingItems = false,
  preferSupabaseLandingSections = false,
}: LandingRuntimeProps) {
  useBookingApiClient();
  useBookingCalendar();
  useBookingFormState();
  useTestimonials(initialTestimonials);
  usePackages(initialPackages);
  useMiniReportContent();
  usePaymentRuntime();
  useLandingContent(
    initialPackages.length > 0,
    initialTestimonials.length > 0,
    initialLandingContent,
    preferSupabaseLandingItems,
    preferSupabaseLandingSections,
  );
  useLandingEffects();
  useBackgroundMusic();

  useEffect(() => {
    const navbar = document.querySelector<HTMLElement>("#navbar");
    const hamburger = document.querySelector<HTMLButtonElement>("#hamburger");
    const navLinks = document.querySelector<HTMLElement>("#nav-links");
    const navLinkItems = Array.from(
      navLinks?.querySelectorAll<HTMLElement>(".nav-link") || [],
    );
    const updateNavbar = () => {
      navbar?.classList.toggle("scrolled", window.scrollY > 50);
    };
    const toggleMenu = () => {
      hamburger?.classList.toggle("active");
      navLinks?.classList.toggle("open");
    };
    const closeMenu = () => {
      hamburger?.classList.remove("active");
      navLinks?.classList.remove("open");
    };

    const methodCards = Array.from(
      document.querySelectorAll<HTMLElement>(".method-card"),
    );
    const toggleMethodCard = (event: Event) => {
      (event.currentTarget as HTMLElement).classList.toggle("is-flipped");
    };
    const handleMethodCardKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      (event.currentTarget as HTMLElement).classList.toggle("is-flipped");
    };
    const methodsBookingButton =
      document.querySelector<HTMLElement>("#btn-methods-booking");
    const scrollToBooking = () => {
      document
        .querySelector("#booking-form")
        ?.scrollIntoView({ behavior: "smooth" });
    };

    const scrollTopButton =
      document.querySelector<HTMLButtonElement>("#scrollTopBtn");
    const updateScrollTopButton = () => {
      scrollTopButton?.classList.toggle(
        "show",
        window.scrollY > document.body.scrollHeight / 2,
      );
    };
    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    updateNavbar();
    updateScrollTopButton();
    window.addEventListener("scroll", updateNavbar, { passive: true });
    window.addEventListener("scroll", updateScrollTopButton, { passive: true });
    hamburger?.addEventListener("click", toggleMenu);
    navLinkItems.forEach((link) => link.addEventListener("click", closeMenu));
    methodCards.forEach((card) => {
      card.addEventListener("click", toggleMethodCard);
      card.addEventListener("keydown", handleMethodCardKey);
    });
    methodsBookingButton?.addEventListener("click", scrollToBooking);
    scrollTopButton?.addEventListener("click", scrollToTop);

    return () => {
      window.removeEventListener("scroll", updateNavbar);
      window.removeEventListener("scroll", updateScrollTopButton);
      hamburger?.removeEventListener("click", toggleMenu);
      navLinkItems.forEach((link) =>
        link.removeEventListener("click", closeMenu),
      );
      methodCards.forEach((card) => {
        card.removeEventListener("click", toggleMethodCard);
        card.removeEventListener("keydown", handleMethodCardKey);
      });
      methodsBookingButton?.removeEventListener("click", scrollToBooking);
      scrollTopButton?.removeEventListener("click", scrollToTop);
    };
  }, []);

  return null;
}
