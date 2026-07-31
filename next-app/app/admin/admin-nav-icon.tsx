import type { ReactNode } from "react";

type AdminNavIconName =
  | "sections"
  | "packages"
  | "testimonials"
  | "blog"
  | "settings"
  | "bookings"
  | "customers"
  | "payments"
  | "numerology";

export function AdminNavIcon({ name }: { name: AdminNavIconName }) {
  const paths: Record<AdminNavIconName, ReactNode> = {
    sections: (
      <>
        <path d="M4 5.5h16M4 12h10M4 18.5h13" />
        <path d="M17.5 9.5v5M15 12h5" />
      </>
    ),
    packages: (
      <>
        <path d="m4 8 8-4 8 4-8 4-8-4Z" />
        <path d="m4 8 8 4 8-4v8l-8 4-8-4V8Z" />
        <path d="M12 12v8" />
      </>
    ),
    testimonials: (
      <>
        <path d="M5 18.5 3.5 21v-5A7.5 7.5 0 1 1 8 19" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </>
    ),
    blog: (
      <>
        <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" />
        <path d="M8 8h7M8 12h7M8 16h4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9c.14.4.24.66.63.85.25.12.55.15.92.15H21v4h-.08c-.37 0-.67.03-.92.15-.39.19-.49.45-.63.85Z" />
      </>
    ),
    bookings: (
      <>
        <rect x="4" y="5.5" width="16" height="15" rx="2" />
        <path d="M8 3v5M16 3v5M4 10h16" />
        <path d="m9 15 2 2 4-4" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19c.6-3.6 2.4-5.4 5.5-5.4s4.9 1.8 5.5 5.4" />
        <path d="M15 6.4a2.8 2.8 0 0 1 0 5.2M16.2 14.2c2.5.5 3.8 2.1 4.3 4.8" />
      </>
    ),
    payments: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h3" />
        <path d="m16 3 2 2 2-2" />
      </>
    ),
    numerology: (
      <>
        <rect x="4" y="3.5" width="16" height="17" rx="2" />
        <path d="M8 8h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h4" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">
        {paths[name]}
      </g>
    </svg>
  );
}
