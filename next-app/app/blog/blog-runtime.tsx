"use client";

import { useEffect } from "react";
import { useBackgroundMusic } from "../use-background-music";
import { useParticlesCanvas } from "../use-particles-canvas";

export default function BlogRuntime() {
  useBackgroundMusic();
  useParticlesCanvas();

  useEffect(() => {
    return () => {
      document.body.classList.remove("landing-content-loading");
    };
  }, []);

  return null;
}
