"use client";

import { useEffect } from "react";
import { useBackgroundMusic } from "../use-background-music";

export default function BlogRuntime() {
  useBackgroundMusic();

  useEffect(() => {
    document.body.classList.add("landing-content-loading");
    return () => {
      document.body.classList.remove("landing-content-loading");
    };
  }, []);

  return null;
}
