"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createAuthBrowserClient } from "@/lib/supabase/auth-browser";
import styles from "../admin.module.css";

type LinkState = "checking" | "ready" | "invalid";

export function SetPasswordForm() {
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [message, setMessage] = useState("Đang xác minh liên kết…");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function acceptInvite() {
      try {
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        const linkError = fragment.get("error_description");
        const supabase = createAuthBrowserClient();
        const { data: existing } = await supabase.auth.getSession();

        if (existing.session) {
          window.history.replaceState({}, "", window.location.pathname);
        } else if (!linkError && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            // Browser-client URL detection and the explicit fallback may race.
            // Accept the result only when a valid session now exists.
            const { data: recovered } = await supabase.auth.getSession();
            if (!recovered.session) throw error;
          }
          window.history.replaceState({}, "", window.location.pathname);
        } else {
          throw new Error("invalid invite");
        }
        if (active) {
          setLinkState("ready");
          setMessage("");
        }
      } catch {
        if (active) {
          setLinkState("invalid");
          setMessage("Liên kết không hợp lệ hoặc đã hết hạn. Hãy gửi lại lời mời.");
        }
      }
    }
    void acceptInvite();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || linkState !== "ready") return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password.length < 12) {
      setMessage("Mật khẩu cần ít nhất 12 ký tự.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Hai mật khẩu chưa trùng khớp.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const supabase = createAuthBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      window.location.replace("/admin");
    } catch {
      setMessage("Không thể đặt mật khẩu. Hãy gửi lại lời mời và thử lại.");
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Mật khẩu mới
        <input name="password" type="password" autoComplete="new-password"
          minLength={12} disabled={linkState !== "ready"} required />
      </label>
      <label className={styles.field}>
        Nhập lại mật khẩu
        <input name="confirmation" type="password" autoComplete="new-password"
          minLength={12} disabled={linkState !== "ready"} required />
      </label>
      <button className={styles.submit} type="submit"
        disabled={submitting || linkState !== "ready"}>
        {submitting ? "Đang lưu…" : "Đặt mật khẩu"}
      </button>
      <p className={styles.message} role="status" aria-live="polite">{message}</p>
    </form>
  );
}
