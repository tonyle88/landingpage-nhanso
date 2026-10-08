"use client";

import { useEffect } from "react";
import { createFrameScheduler } from "@/lib/browser-animation";
import { useParticlesCanvas } from "./use-particles-canvas";

type RevealWindow = Window & {
  revealObserver?: IntersectionObserver;
};

const SECTION_TITLES: Record<string, string> = {
  hero: "Khám Phá",
  about: "Về Chúng Tôi",
  "pain-points": "Bạn Đang Gặp Phải?",
  benefits: "Những Gì Bạn Nhận Được",
  packages: "Gói Tư Vấn",
  process: "Hành Trình",
  testimonials: "Khách Hàng Nói Gì?",
  contact: "Liên Hệ",
};

function useRevealObserver() {
  useEffect(() => {
    const revealWindow = window as RevealWindow;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    revealWindow.revealObserver = observer;
    document
      .querySelectorAll<HTMLElement>(".reveal")
      .forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      if (revealWindow.revealObserver === observer) {
        delete revealWindow.revealObserver;
      }
    };
  }, []);
}

function useScrollProgress() {
  useEffect(() => {
    const scrollProgress =
      document.querySelector<HTMLElement>("#scrollProgress");
    const scrollTitle = document.querySelector<HTMLElement>("#scrollTitle");
    if (!scrollProgress) return;

    const updateScrollProgress = () => {
      const scrollY = window.scrollY;
      const totalHeight = Math.max(
        1,
        document.body.scrollHeight - window.innerHeight,
      );
      const progressWidth = Math.min(100, (scrollY / totalHeight) * 100);
      scrollProgress.style.width = `${progressWidth}%`;

      if (!scrollTitle) return;

      let currentSectionId = "";
      document.querySelectorAll<HTMLElement>("section").forEach((section) => {
        if (scrollY >= section.offsetTop - 100) {
          currentSectionId = section.id;
        }
      });

      scrollTitle.textContent =
        SECTION_TITLES[currentSectionId] || "Trang Chủ";
      scrollTitle.style.opacity = scrollY < 50 ? "0" : "1";

      const titleWidth = scrollTitle.offsetWidth;
      const barRight = scrollProgress.getBoundingClientRect().right;
      const leftEdge = barRight - titleWidth / 2;
      const rightEdge = barRight + titleWidth / 2;
      let xOffset = titleWidth / 2;

      if (leftEdge < 10) {
        xOffset += 10 - leftEdge;
      } else if (rightEdge > window.innerWidth - 10) {
        xOffset -= rightEdge - (window.innerWidth - 10);
      }
      scrollTitle.style.transform = `translateX(${xOffset}px)`;
    };

    const updates = createFrameScheduler(updateScrollProgress);
    updateScrollProgress();
    window.addEventListener("scroll", updates.schedule, { passive: true });
    window.addEventListener("resize", updates.schedule, { passive: true });

    return () => {
      updates.cancel();
      window.removeEventListener("scroll", updates.schedule);
      window.removeEventListener("resize", updates.schedule);
    };
  }, []);
}

export function useLandingEffects() {
  useRevealObserver();
  useParticlesCanvas();
  useScrollProgress();
}
