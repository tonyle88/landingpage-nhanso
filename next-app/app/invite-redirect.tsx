"use client";

import { useEffect } from "react";

export function InviteRedirect() {
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const type = fragment.get("type");
    const hasSessionTokens =
      fragment.has("access_token") && fragment.has("refresh_token");
    const isPasswordLink =
      type === "invite" || type === "recovery" || hasSessionTokens;
    if (!isPasswordLink) return;

    window.location.replace(`/admin/set-password${window.location.hash}`);
  }, []);

  return null;
}
