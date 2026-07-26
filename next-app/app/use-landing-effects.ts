"use client";

import { useEffect } from "react";

type RevealWindow = Window & {
  revealObserver?: IntersectionObserver;
};

type Particle = {
  x: number;
  y: number;
  radius: number;
  dx: number;
  dy: number;
  color: string;
  alpha: number;
  pulse: number;
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

function useParticlesCanvas() {
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      "#particles-canvas",
    );
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;
    const colors = [
      "rgba(217, 78, 31, alpha)",
      "rgba(212, 168, 67, alpha)",
      "rgba(232, 168, 120, alpha)",
      "rgba(27, 97, 107, alpha)",
    ];
    const particles: Particle[] = Array.from({ length: 70 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.4,
      dy: (Math.random() - 0.5) * 0.4 - 0.1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const animate = () => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.pulse += 0.02;
        const alpha =
          particle.alpha * (0.7 + 0.3 * Math.sin(particle.pulse));

        if (particle.x < 0) particle.x = width;
        if (particle.x > width) particle.x = 0;
        if (particle.y < 0) particle.y = height;
        if (particle.y > height) particle.y = 0;

        context.beginPath();
        context.arc(
          particle.x,
          particle.y,
          particle.radius,
          0,
          Math.PI * 2,
        );
        context.fillStyle = particle.color.replace("alpha", String(alpha));
        context.fill();
      });

      particles.forEach((particle, index) => {
        particles.slice(index + 1, index + 5).forEach((neighbor) => {
          const distance = Math.hypot(
            particle.x - neighbor.x,
            particle.y - neighbor.y,
          );
          if (distance >= 120) return;

          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(neighbor.x, neighbor.y);
          context.strokeStyle = `rgba(212, 168, 67, ${(1 - distance / 120) * 0.08})`;
          context.lineWidth = 0.5;
          context.stroke();
        });
      });

      animationFrame = window.requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resizeCanvas);
      context.clearRect(0, 0, width, height);
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

    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
    };
  }, []);
}

export function useLandingEffects() {
  useRevealObserver();
  useParticlesCanvas();
  useScrollProgress();
}
