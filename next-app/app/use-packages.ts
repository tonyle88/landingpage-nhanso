"use client";

import { useEffect } from "react";
import type { PublicPackage } from "@/lib/packages";

type PackageData = PublicPackage;

declare global {
  interface Window {
    ClowPackagesRuntime?: {
      render: (packages: unknown[]) => void;
    };
  }
}

function normalizePackages(values: unknown[]) {
  return values
    .map<PackageData | null>((value, index) => {
      if (!value || typeof value !== "object") return null;
      const item = value as Record<string, unknown>;
      const code = String(item.code || "").trim();
      const name = String(item.name || "").trim();
      const onlinePrice = Number(item.onlinePrice || 0);
      if (item.enabled === false || !code || !name || onlinePrice <= 0) {
        return null;
      }
      const rawUnit = String(item.unit || "/buổi").trim();
      return {
        code,
        name,
        onlinePrice,
        unit: rawUnit.startsWith("/") ? rawUnit : `/${rawUnit}`,
        icon: String(item.icon || "sparkles").replace(/^fa-/, ""),
        accent: String(item.accent || "teal").toLowerCase(),
        featured: item.featured === true,
        badge: String(item.badge || "").trim(),
        features: Array.isArray(item.features)
          ? item.features.map(String).filter(Boolean)
          : [],
        buttonText: String(item.buttonText || "Đặt Lịch Ngay").trim(),
        sortOrder: Number(item.sortOrder || index + 1),
        enabled: true,
      };
    })
    .filter((item): item is PackageData => Boolean(item))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function appendSanitizedHtml(element: HTMLElement, value: string) {
  element.innerHTML = window.ClowSanitizeHtml?.(value) || "";
}

function createPackageCard(item: PackageData, index: number) {
  const card = document.createElement("div");
  card.className = `package-card reveal${item.featured ? " package-featured" : ""}`;
  card.dataset.delay = String(index * 100);

  const glow = document.createElement("div");
  const glowClass =
    item.accent === "gold"
      ? "glow-gold"
      : item.accent === "orange"
        ? "glow-orange"
        : "glow-teal";
  glow.className = `package-glow ${glowClass}`;
  card.appendChild(glow);

  if (item.featured) {
    const ring = document.createElement("div");
    ring.className = "featured-glow-ring";
    card.appendChild(ring);
  }
  if (item.badge) {
    const badge = document.createElement("div");
    badge.className = "featured-badge";
    badge.textContent = item.badge;
    card.appendChild(badge);
  }

  const header = document.createElement("div");
  header.className = "package-header";
  const icon = document.createElement("div");
  icon.className = `package-icon${item.featured ? " featured-icon" : ""}`;
  const iconGlyph = document.createElement("i");
  iconGlyph.className = `fa-solid fa-${item.icon}`;
  iconGlyph.setAttribute("aria-hidden", "true");
  icon.appendChild(iconGlyph);
  const name = document.createElement("h3");
  name.className = `package-name${item.featured ? " featured-name" : ""}`;
  appendSanitizedHtml(name, item.name);
  const price = document.createElement("div");
  price.className = `package-price${item.featured ? " featured-price-wrap" : ""}`;
  const currentPrice = document.createElement("span");
  currentPrice.className = `price-current${item.featured ? " price-highlight" : ""}`;
  currentPrice.textContent = Number(item.onlinePrice).toLocaleString("vi-VN");
  const currency = document.createElement("sup");
  currency.textContent = "đ";
  currentPrice.appendChild(currency);
  const unit = document.createElement("span");
  unit.className = "price-unit";
  unit.textContent = item.unit;
  price.append(currentPrice, unit);
  header.append(icon, name, price);
  card.appendChild(header);

  const divider = document.createElement("div");
  divider.className = `package-divider${item.featured ? " featured-divider" : ""}`;
  card.appendChild(divider);
  const features = document.createElement("ul");
  features.className = "package-features";
  item.features.forEach((feature) => {
    const row = document.createElement("li");
    const check = document.createElement("span");
    check.className = `feature-check${item.featured ? " featured-check" : ""}`;
    check.textContent = "✦";
    const text = document.createElement("span");
    appendSanitizedHtml(text, feature);
    row.append(check, document.createTextNode(" "), text);
    features.appendChild(row);
  });
  card.appendChild(features);

  const cta = document.createElement("a");
  cta.href = "#contact";
  cta.className = item.featured
    ? "btn btn-primary btn-featured-pkg"
    : "btn btn-package";
  cta.id = `pkg-${item.code}`;
  cta.dataset.packageCode = item.code;
  cta.textContent = item.buttonText;
  card.appendChild(cta);
  return card;
}

export function usePackages(initialPackages: PublicPackage[] = []) {
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>("#packages .packages-grid");
    if (!grid) return;
    let disposeRender = () => {};

    const render = (values: unknown[]) => {
      const packages = normalizePackages(values);
      if (!packages.length) return;
      disposeRender();
      grid.replaceChildren();
      document.querySelector("#packages .package-carousel-controls")?.remove();
      grid.classList.toggle("packages-grid-3", packages.length === 3);
      grid.classList.toggle("packages-carousel-enabled", packages.length > 3);

      const cleanupCallbacks: Array<() => void> = [];
      const revealTimers: number[] = [];
      packages.forEach((item, index) => {
        const card = createPackageCard(item, index);
        const handlePointerMove = (event: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty(
            "--mouse-x",
            `${((event.clientX - rect.left) / rect.width) * 100}%`,
          );
          card.style.setProperty(
            "--mouse-y",
            `${((event.clientY - rect.top) / rect.height) * 100}%`,
          );
        };
        card.addEventListener("mousemove", handlePointerMove);
        cleanupCallbacks.push(() =>
          card.removeEventListener("mousemove", handlePointerMove),
        );
        grid.appendChild(card);
        revealTimers.push(
          window.setTimeout(() => card.classList.add("visible"), 80 + index * 80),
        );
      });

      if (packages.length > 3) {
        const controls = document.createElement("div");
        controls.className = "package-carousel-controls";
        const previous = document.createElement("button");
        previous.className = "package-carousel-btn";
        previous.type = "button";
        previous.dataset.packageSlide = "prev";
        previous.setAttribute("aria-label", "Xem gói trước");
        const previousIcon = document.createElement("i");
        previousIcon.className = "fa-solid fa-chevron-left";
        previousIcon.setAttribute("aria-hidden", "true");
        previous.appendChild(previousIcon);
        const status = document.createElement("div");
        status.className = "package-carousel-status";
        status.setAttribute("aria-live", "polite");
        const range = document.createElement("span");
        range.className = "package-carousel-range";
        const dots = document.createElement("div");
        dots.className = "package-carousel-dots";
        dots.setAttribute("aria-label", "Chọn gói tư vấn");
        status.append(range, dots);
        const next = document.createElement("button");
        next.className = "package-carousel-btn";
        next.type = "button";
        next.dataset.packageSlide = "next";
        next.setAttribute("aria-label", "Xem gói tiếp theo");
        const nextIcon = document.createElement("i");
        nextIcon.className = "fa-solid fa-chevron-right";
        nextIcon.setAttribute("aria-hidden", "true");
        next.appendChild(nextIcon);
        controls.append(previous, status, next);
        grid.after(controls);

        let activeIndex = 0;
        let updateTimer = 0;
        const getStep = () => {
          const firstCard = grid.querySelector<HTMLElement>(".package-card");
          if (!firstCard) return grid.clientWidth;
          const styles = window.getComputedStyle(grid);
          return (
            firstCard.getBoundingClientRect().width +
            (parseFloat(styles.columnGap || styles.gap || "0") || 0)
          );
        };
        const visibleCount = () =>
          Math.max(1, Math.round(grid.clientWidth / getStep()));
        const maxStartIndex = () =>
          Math.max(0, packages.length - visibleCount());
        const update = () => {
          activeIndex = Math.max(
            0,
            Math.min(Math.round(grid.scrollLeft / getStep()), maxStartIndex()),
          );
          const end = Math.min(packages.length, activeIndex + visibleCount());
          range.textContent = `${activeIndex + 1}${end > activeIndex + 1 ? `-${end}` : ""} / ${packages.length}`;
          previous.disabled = activeIndex <= 0;
          next.disabled = activeIndex >= maxStartIndex();
          dots.querySelectorAll(".package-carousel-dot").forEach((dot, index) => {
            const active = index === activeIndex;
            dot.classList.toggle("is-active", active);
            dot.setAttribute("aria-current", active ? "true" : "false");
          });
        };
        const scrollTo = (index: number) => {
          const target = Math.max(0, Math.min(index, maxStartIndex()));
          grid.scrollTo({ left: getStep() * target, behavior: "smooth" });
          window.clearTimeout(updateTimer);
          updateTimer = window.setTimeout(update, 360);
        };
        packages.forEach((_, index) => {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "package-carousel-dot";
          dot.setAttribute("aria-label", `Xem gói tư vấn ${index + 1}`);
          dot.addEventListener("click", () => scrollTo(index));
          dots.appendChild(dot);
        });
        const showPrevious = () => scrollTo(activeIndex - 1);
        const showNext = () => scrollTo(activeIndex + 1);
        previous.addEventListener("click", showPrevious);
        next.addEventListener("click", showNext);
        grid.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });
        const initialTimer = window.setTimeout(update, 120);
        cleanupCallbacks.push(() => {
          window.clearTimeout(initialTimer);
          window.clearTimeout(updateTimer);
          previous.removeEventListener("click", showPrevious);
          next.removeEventListener("click", showNext);
          grid.removeEventListener("scroll", update);
          window.removeEventListener("resize", update);
          controls.remove();
        });
      }

      disposeRender = () => {
        revealTimers.forEach(window.clearTimeout);
        cleanupCallbacks.forEach((cleanup) => cleanup());
      };
    };

    window.ClowPackagesRuntime = { render };
    if (initialPackages.length) render(initialPackages);
    return () => {
      disposeRender();
      if (window.ClowPackagesRuntime?.render === render) {
        delete window.ClowPackagesRuntime;
      }
    };
  }, [initialPackages]);
}
