"use client";

import { useState, type FormEvent } from "react";
import { createAuthBrowserClient } from "@/lib/supabase/auth-browser";
import styles from "../admin.module.css";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    if (!email || !password) {
      setMessage("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const supabase = createAuthBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage("Không thể đăng nhập. Vui lòng kiểm tra lại thông tin.");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setMessage("Hệ thống đăng nhập tạm thời không khả dụng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
        />
      </label>
      <label className={styles.field}>
        Mật khẩu
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={12}
          required
        />
      </label>
      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? "Đang xác minh…" : "Đăng nhập"}
      </button>
      <p className={styles.message} role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
