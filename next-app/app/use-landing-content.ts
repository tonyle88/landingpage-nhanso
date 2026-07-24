"use client";

import { useEffect } from "react";
import type {
  LandingContentItem,
  LandingSection,
  PublicLandingContent,
} from "@/lib/landing-content";

const CONTENT_URL =
  "https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec";
const CACHE_KEY = "clowcat_landing_content_cache_v5";
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 9000;
const LOADING_MAX_MS = 1600;
const RETRY_COUNT = 2;

type RuntimeLandingContentItem = Omit<LandingContentItem, "key" | "value"> & {
  key?: string;
  selector?: string;
  value?: unknown;
};

type LandingContentPayload = {
  ok?: boolean;
  message?: string;
  items: RuntimeLandingContentItem[];
  paymentSettings?: unknown;
  feedbackImages?: unknown[];
  packages?: unknown[];
  sectionsLayout?: LandingSection[];
  [key: string]: unknown;
};

type LandingContentBridge = {
  applyLegacy: (
    payload: LandingContentPayload,
    options: { fromCache: boolean },
  ) => void;
};

const CONTENT_OVERRIDES: Record<string, { selector: string; type: string }> = {
  "hero.badge": { selector: ".hero-badge", type: "text" },
  "hero.title_1": { selector: ".hero-title .title-line:nth-child(1)", type: "text" },
  "hero.title_2": { selector: ".hero-title .title-line:nth-child(2)", type: "text" },
  "hero.title_3": { selector: ".hero-title .title-line:nth-child(3)", type: "text" },
  "hero.subtitle": { selector: ".hero-subtitle", type: "text" },
  "hero.stat_1_number": { selector: ".hero-stats .stat-item:nth-child(1) .stat-number", type: "text" },
  "hero.stat_1_label": { selector: ".hero-stats .stat-item:nth-child(1) .stat-label", type: "text" },
  "hero.stat_2_number": { selector: ".hero-stats .stat-item:nth-child(3) .stat-number", type: "text" },
  "hero.stat_2_label": { selector: ".hero-stats .stat-item:nth-child(3) .stat-label", type: "text" },
  "hero.stat_3_number": { selector: ".hero-stats .stat-item:nth-child(5) .stat-number", type: "text" },
  "hero.stat_3_label": { selector: ".hero-stats .stat-item:nth-child(5) .stat-label", type: "text" },
  "hero.cta_primary": { selector: "#hero-cta-primary span", type: "text" },
  "hero.cta_secondary": { selector: "#hero-cta-secondary", type: "text" },
  "hero.scroll_label": { selector: ".scroll-indicator span", type: "text" },
};

declare global {
  interface Window {
    ClowLandingContentRuntime?: LandingContentBridge;
    ClowLandingContentSettled?: boolean;
    ClowSanitizeHtml?: (value: unknown) => string;
    revealObserver?: IntersectionObserver;
  }
}

function isValidPayload(value: unknown): value is LandingContentPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<LandingContentPayload>;
  return payload.ok !== false && Array.isArray(payload.items);
}

function readCache(): LandingContentPayload | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as {
      savedAt?: number;
      payload?: unknown;
    };
    if (
      !cached.savedAt ||
      Date.now() - cached.savedAt > CACHE_MAX_AGE_MS ||
      !isValidPayload(cached.payload)
    ) {
      return null;
    }
    return cached.payload;
  } catch {
    return null;
  }
}

function writeCache(payload: LandingContentPayload) {
  try {
    const cachePayload = { ...payload };
    delete cachePayload.paymentSettings;
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), payload: cachePayload }),
    );
  } catch {
    // Cache is best-effort and must never block the landing page.
  }
}

function sanitizeHtml(value: unknown) {
  return window.ClowSanitizeHtml?.(value) || "";
}

function applyContentItem(item: RuntimeLandingContentItem) {
  if (item.enabled === false) return;
  const key = String(item.key || "").trim();
  const override = CONTENT_OVERRIDES[key];
  const selector = String(override?.selector || item.selector || "").trim();
  let value = item.value == null ? "" : String(item.value);
  const trimmed = value.trim();
  if (key === "hero.stat_3_number" && trimmed === "1") value = "100%";
  if (
    (key === "hero.subtitle" || item.selector === ".hero-subtitle") &&
    /^[\d\s+%.,/]+$/.test(trimmed)
  ) {
    return;
  }
  if (!selector || !value) return;

  const type = String(override?.type || item.type || "text").toLowerCase();
  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    if (type === "html") {
      const html = element.matches("#about .mentor-feature-card span")
        ? value
            .replace(/<\/p>\s*<p[^>]*>/gi, " ")
            .replace(/^\s*<p[^>]*>/i, "")
            .replace(/<\/p>\s*$/i, "")
            .replace(/\s{2,}/g, " ")
            .replace(/\s+(<strong\b)/gi, "&nbsp;$1")
            .trim()
        : value;
      element.innerHTML = sanitizeHtml(html);
      return;
    }
    if (type === "attr" || type === "attribute") {
      if (item.attribute) element.setAttribute(item.attribute, value);
      return;
    }
    if (type === "placeholder") {
      element.setAttribute("placeholder", value);
      return;
    }
    if (["href", "src", "alt", "aria-label"].includes(type)) {
      element.setAttribute(type, value);
      const previous = element.previousElementSibling;
      if (type === "src" && element.tagName === "IMG" && previous?.tagName === "SOURCE") {
        previous.setAttribute("srcset", value);
      }
      return;
    }
    element.textContent = value;
  });
}

function applySectionsLayout(layout: LandingSection[]) {
  const container = document.querySelector<HTMLElement>("#dynamic-layout");
  if (!container) return;
  container.querySelectorAll(".generic-section").forEach((element) => element.remove());

  layout.forEach((section) => {
    if (section.type === "builtin") {
      const element = document.getElementById(section.id);
      if (!element) return;
      element.style.order = String(section.order);
      element.style.display = section.enabled ? "" : "none";
      return;
    }
    if (section.type !== "generic" || !section.enabled) return;

    const element = document.createElement("section");
    element.className = "generic-section section";
    element.id = section.id;
    element.style.order = String(section.order);
    const inner = document.createElement("div");
    inner.className = "container";
    const header = document.createElement("div");
    header.className = "section-header reveal";
    if (section.tag) {
      const tag = document.createElement("span");
      tag.className = "section-tag";
      tag.textContent = section.tag;
      header.appendChild(tag);
    }
    const title = document.createElement("h2");
    title.className = "section-title";
    title.textContent = section.title || "";
    const divider = document.createElement("div");
    divider.className = "section-divider";
    ["✦", "✦", "✦"].forEach((symbol) => {
      const span = document.createElement("span");
      span.textContent = symbol;
      divider.appendChild(span);
    });
    header.append(title, divider);
    const content = document.createElement("div");
    content.className = "generic-content reveal";
    content.innerHTML = sanitizeHtml(section.contentHtml || "");
    inner.append(header, content);
    element.appendChild(inner);
    container.appendChild(element);
    element.querySelectorAll(".reveal").forEach((child) => {
      window.revealObserver?.observe(child);
    });
  });
}

function applyReactContent(
  payload: LandingContentPayload,
  preferSupabasePackages: boolean,
  preferSupabaseTestimonials: boolean,
  preferSupabaseItems: boolean,
  preferSupabaseSections: boolean,
) {
  if (!preferSupabaseItems) {
    payload.items.forEach(applyContentItem);
    window.ClowMiniReportRuntime?.sync(payload.items);
  }
  if (payload.paymentSettings) {
    window.ClowPaymentRuntime?.applySettings(payload.paymentSettings);
  }
  if (
    !preferSupabaseTestimonials &&
    Array.isArray(payload.feedbackImages) &&
    payload.feedbackImages.length
  ) {
    window.ClowTestimonialsRuntime?.render(payload.feedbackImages);
  }
  if (
    !preferSupabasePackages &&
    Array.isArray(payload.packages) &&
    payload.packages.length
  ) {
    window.ClowPackagesRuntime?.render(payload.packages);
  }
  const consultationNumber = document
    .querySelector(".hero-stats .stat-item:nth-child(3) .stat-number")
    ?.textContent?.trim();
  const badge = document.querySelector<HTMLElement>(".hero-badge");
  const number = consultationNumber?.match(/\d+/)?.[0];
  if (badge && number && /Hơn\s*\d+/i.test(badge.textContent)) {
    badge.textContent = badge.textContent.replace(/Hơn\s*\d+\+?/i, `Hơn ${number}`);
  }
  if (!preferSupabaseSections && Array.isArray(payload.sectionsLayout)) {
    applySectionsLayout(payload.sectionsLayout);
  }
}

async function fetchOnce(signal: AbortSignal, attempt: number) {
  const response = await fetch(
    `${CONTENT_URL}?action=getLandingContent&_=${Date.now()}&try=${attempt}`,
    { method: "GET", mode: "cors", cache: "no-store", signal },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const payload: unknown = await response.json();
  if (!isValidPayload(payload)) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Payload Google Sheet không hợp lệ.";
    throw new Error(message);
  }
  return payload;
}

async function fetchWithRetry(signal: AbortSignal) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRY_COUNT + 1; attempt += 1) {
    const timeoutController = new AbortController();
    const abortRequest = () => timeoutController.abort();
    signal.addEventListener("abort", abortRequest, { once: true });
    const timeout = window.setTimeout(abortRequest, FETCH_TIMEOUT_MS);

    try {
      return await fetchOnce(timeoutController.signal, attempt);
    } catch (error) {
      lastError = error;
      if (signal.aborted || attempt > RETRY_COUNT) break;
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, 450 * attempt),
      );
    } finally {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", abortRequest);
    }
  }
  throw lastError;
}

function waitForBridge(signal: AbortSignal) {
  return new Promise<LandingContentBridge>((resolve, reject) => {
    if (window.ClowLandingContentRuntime) {
      resolve(window.ClowLandingContentRuntime);
      return;
    }

    const handleReady = () => {
      if (!window.ClowLandingContentRuntime) return;
      cleanup();
      resolve(window.ClowLandingContentRuntime);
    };
    const handleAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    const cleanup = () => {
      window.removeEventListener("clow-landing-runtime-ready", handleReady);
      signal.removeEventListener("abort", handleAbort);
    };

    window.addEventListener("clow-landing-runtime-ready", handleReady);
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

export function useLandingContent(
  preferSupabasePackages = false,
  preferSupabaseTestimonials = false,
  initialContent?: PublicLandingContent,
  preferSupabaseItems = false,
  preferSupabaseSections = false,
) {
  useEffect(() => {
    const controller = new AbortController();
    window.ClowLandingContentSettled = false;
    document.body.classList.add("landing-content-loading");
    const finishLoading = () => {
      document.body.classList.remove("landing-content-loading");
    };
    const loaderTimer = window.setTimeout(finishLoading, LOADING_MAX_MS);

    const load = async () => {
      const bridge = await waitForBridge(controller.signal);
      if (initialContent && (preferSupabaseItems || preferSupabaseSections)) {
        applyReactContent(
          initialContent,
          preferSupabasePackages,
          preferSupabaseTestimonials,
          false,
          false,
        );
        bridge.applyLegacy(initialContent, { fromCache: true });
      }
      const cachedPayload = readCache();
      if (cachedPayload) {
        applyReactContent(
          cachedPayload,
          preferSupabasePackages,
          preferSupabaseTestimonials,
          preferSupabaseItems,
          preferSupabaseSections,
        );
        bridge.applyLegacy(cachedPayload, { fromCache: true });
        finishLoading();
      }

      try {
        const payload = await fetchWithRetry(controller.signal);
        if (controller.signal.aborted) return;
        applyReactContent(
          payload,
          preferSupabasePackages,
          preferSupabaseTestimonials,
          preferSupabaseItems,
          preferSupabaseSections,
        );
        bridge.applyLegacy(payload, { fromCache: false });
        writeCache(payload);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn(
            cachedPayload
              ? "Không tải được nội dung mới, đang dùng bản cache gần nhất."
              : "Không tải được nội dung, đang dùng nội dung dự phòng.",
            error,
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          window.ClowLandingContentSettled = true;
          window.dispatchEvent(new Event("clow-landing-content-settled"));
          finishLoading();
        }
      }
    };

    void load();

    return () => {
      controller.abort();
      window.clearTimeout(loaderTimer);
      finishLoading();
    };
  }, [
    initialContent,
    preferSupabaseItems,
    preferSupabasePackages,
    preferSupabaseSections,
    preferSupabaseTestimonials,
  ]);
}
