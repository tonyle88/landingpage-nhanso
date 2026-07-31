"use client";

import { useEffect } from "react";

export function InviteRedirect() {
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const fragment = new URLSearchParams(currentUrl.hash.slice(1));
    const type = fragment.get("type") || currentUrl.searchParams.get("type");
    const hasSessionTokens =
      fragment.has("access_token") && fragment.has("refresh_token");
    const hasCode = currentUrl.searchParams.has("code");
    const hasTokenHash = currentUrl.searchParams.has("token_hash");
    const hasAuthError =
      currentUrl.searchParams.has("error") ||
      fragment.has("error_description");
    const isPasswordLink =
      type === "invite" ||
      type === "recovery" ||
      hasSessionTokens ||
      hasCode ||
      hasTokenHash ||
      hasAuthError;
    if (!isPasswordLink) return;

    const destination = new URL("/admin/set-password", window.location.origin);
    destination.search = currentUrl.search;
    destination.hash = currentUrl.hash;
    window.location.replace(
      `${destination.pathname}${destination.search}${destination.hash}`,
    );
  }, []);

  return null;
}
