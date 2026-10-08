"use client";

import { useEffect } from "react";
import { startVisibleAnimation } from "@/lib/browser-animation";

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

export function useParticlesCanvas() {
  useEffect(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      "#particles-canvas",
    );
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const colors = [
      "rgba(217, 78, 31, alpha)",
      "rgba(212, 168, 67, alpha)",
      "rgba(232, 168, 120, alpha)",
      "rgba(27, 97, 107, alpha)",
    ];
    const particles: Particle[] = Array.from({ length: width < 768 ? 30 : 70 }, () => ({
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

    const animate = (_timestamp: number, elapsedMs: number) => {
      const step = Math.min(elapsedMs / (1000 / 60), 3);
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        particle.x += particle.dx * step;
        particle.y += particle.dy * step;
        particle.pulse += 0.02 * step;
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

      if (width >= 768) particles.forEach((particle, index) => {
        const end = Math.min(particles.length, index + 5);
        for (let neighborIndex = index + 1; neighborIndex < end; neighborIndex += 1) {
          const neighbor = particles[neighborIndex];
          const distance = Math.hypot(
            particle.x - neighbor.x,
            particle.y - neighbor.y,
          );
          if (distance >= 120) continue;

          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(neighbor.x, neighbor.y);
          context.strokeStyle = `rgba(212, 168, 67, ${(1 - distance / 120) * 0.08})`;
          context.lineWidth = 0.5;
          context.stroke();
        }
      });
    };

    resizeCanvas();
    const stopAnimation = startVisibleAnimation(animate);
    window.addEventListener("resize", resizeCanvas, { passive: true });

    return () => {
      stopAnimation();
      window.removeEventListener("resize", resizeCanvas);
      context.clearRect(0, 0, width, height);
    };
  }, []);
}
