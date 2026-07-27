"use client";

import { useEffect } from "react";

export function PrintReport() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <button className="report-print-button" onClick={() => window.print()} type="button">
      In / Lưu PDF
    </button>
  );
}
