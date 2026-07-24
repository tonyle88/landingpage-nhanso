"use client";

import { useEffect } from "react";
import type { PublicTestimonial } from "@/lib/testimonials";

type FeedbackImage = {
  url?: unknown;
  altText?: unknown;
  sortOrder?: unknown;
  createdAtMs?: unknown;
  createdAt?: unknown;
};

type NormalizedFeedbackImage = {
  url: string;
  altText: string;
  originalIndex: number;
  createdAtMs: number;
};

const DEFAULT_IMAGES: FeedbackImage[] = Array.from(
  { length: 10 },
  (_, index) => ({
    url: `/assets/images/testimonials/testimonial-${String(index + 1).padStart(2, "0")}.png`,
  }),
);

declare global {
  interface Window {
    ClowTestimonialsRuntime?: {
      render: (images: unknown[]) => void;
    };
  }
}

function parseCreatedAt(value: unknown) {
  if (!value) return 0;
  const text = String(value).trim();
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.getTime();

  const match = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) return 0;
  const [, day, month, year, hour = "0", minute = "0", second = "0"] =
    match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ).getTime();
}

function normalizeImages(images: unknown[]) {
  return images
    .map<NormalizedFeedbackImage | null>((value, index) => {
      const image =
        value && typeof value === "object" ? (value as FeedbackImage) : {};
      const url = String(image?.url || "").trim();
      if (!url) return null;
      const serverOrder = Number(image.sortOrder ?? image.createdAtMs ?? 0);
      return {
        url,
        altText: String(image.altText || "").trim(),
        originalIndex: index,
        createdAtMs:
          Number.isFinite(serverOrder) && serverOrder > 0
            ? serverOrder
            : parseCreatedAt(image.createdAt) || index + 1,
      };
    })
    .filter((image): image is NormalizedFeedbackImage => Boolean(image))
    .sort(
      (a, b) =>
        b.createdAtMs - a.createdAtMs ||
        b.originalIndex - a.originalIndex,
    );
}

export function useTestimonials(initialTestimonials: PublicTestimonial[] = []) {
  useEffect(() => {
    const track =
      document.querySelector<HTMLElement>("#testimonials-track");
    const dots = document.querySelector<HTMLElement>("#testimonials-dots");
    const previousButton = document.querySelector<HTMLButtonElement>(
      ".testimonial-nav-prev",
    );
    const nextButton = document.querySelector<HTMLButtonElement>(
      ".testimonial-nav-next",
    );
    if (!track) return;

    let disposeCarousel = () => {};
    const render = (images: unknown[]) => {
      const normalized = normalizeImages(images);
      if (!normalized.length) return;
      disposeCarousel();
      track.replaceChildren();
      dots?.replaceChildren();

      const cards = normalized.map((image, index) => {
        const card = document.createElement("figure");
        card.className = `testimonial-card${index === 0 ? " is-active" : ""}`;
        const wrap = document.createElement("div");
        wrap.className = "testimonial-image-wrap";
        const imageElement = document.createElement("img");
        imageElement.src = image.url;
        imageElement.alt =
          image.altText || `Cảm nhận của khách hàng ${index + 1}`;
        imageElement.loading = "lazy";
        imageElement.decoding = "async";
        imageElement.width = 420;
        imageElement.height = 620;
        imageElement.referrerPolicy = "no-referrer";
        imageElement.addEventListener(
          "error",
          () => {
            const fallback = String(
              DEFAULT_IMAGES[index % DEFAULT_IMAGES.length]?.url || "",
            );
            if (
              fallback &&
              imageElement.dataset.fallbackApplied !== "true"
            ) {
              imageElement.dataset.fallbackApplied = "true";
              imageElement.src = fallback;
            }
          },
          { once: true },
        );
        wrap.appendChild(imageElement);
        card.appendChild(wrap);
        track.appendChild(card);
        return card;
      });

      let activeIndex = 0;
      let scrollTimer = 0;
      const dotButtons: HTMLButtonElement[] = [];
      const setActive = (index: number) => {
        activeIndex = (index + cards.length) % cards.length;
        cards.forEach((card, cardIndex) => {
          card.classList.toggle("is-active", cardIndex === activeIndex);
        });
        dotButtons.forEach((dot, dotIndex) => {
          const active = dotIndex === activeIndex;
          dot.classList.toggle("is-active", active);
          dot.setAttribute("aria-current", active ? "true" : "false");
        });
      };
      const center = (
        index: number,
        behavior: ScrollBehavior = "smooth",
      ) => {
        const normalizedIndex = (index + cards.length) % cards.length;
        const card = cards[normalizedIndex];
        const trackRect = track.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        track.scrollTo({
          left:
            track.scrollLeft +
            cardRect.left -
            trackRect.left -
            (trackRect.width - cardRect.width) / 2,
          behavior,
        });
        setActive(normalizedIndex);
      };
      const handleScroll = () => {
        window.clearTimeout(scrollTimer);
        scrollTimer = window.setTimeout(() => {
          const trackRect = track.getBoundingClientRect();
          const centerPoint = trackRect.left + trackRect.width / 2;
          let nearestIndex = activeIndex;
          let nearestDistance = Number.POSITIVE_INFINITY;
          cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            const distance = Math.abs(
              cardRect.left + cardRect.width / 2 - centerPoint,
            );
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = index;
            }
          });
          setActive(nearestIndex);
        }, 90);
      };
      const showPrevious = () => center(activeIndex - 1);
      const showNext = () => center(activeIndex + 1);

      cards.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "testimonial-dot";
        dot.setAttribute("aria-label", `Xem feedback ${index + 1}`);
        dot.addEventListener("click", () => center(index));
        dots?.appendChild(dot);
        dotButtons.push(dot);
      });
      previousButton?.addEventListener("click", showPrevious);
      nextButton?.addEventListener("click", showNext);
      track.addEventListener("scroll", handleScroll, { passive: true });
      setActive(0);
      const initialFrame = window.requestAnimationFrame(() => center(0, "auto"));

      disposeCarousel = () => {
        window.cancelAnimationFrame(initialFrame);
        window.clearTimeout(scrollTimer);
        previousButton?.removeEventListener("click", showPrevious);
        nextButton?.removeEventListener("click", showNext);
        track.removeEventListener("scroll", handleScroll);
      };
    };

    window.ClowTestimonialsRuntime = { render };
    render(
      initialTestimonials.length ? initialTestimonials : DEFAULT_IMAGES,
    );

    return () => {
      disposeCarousel();
      if (window.ClowTestimonialsRuntime?.render === render) {
        delete window.ClowTestimonialsRuntime;
      }
    };
  }, [initialTestimonials]);
}
