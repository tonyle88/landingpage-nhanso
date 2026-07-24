"use client";

import { useEffect } from "react";

export default function BlogRuntime() {
  useEffect(() => {
    document.body.classList.add("landing-content-loading");
    return () => {
      document.body.classList.remove("landing-content-loading");
    };
  }, []);

  return null;
}
