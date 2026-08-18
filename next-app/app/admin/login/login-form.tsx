"use client";

import { useState, type FormEvent } from "react";
import {
  loginFeedbackFromResponse,
  loginFeedbackMessage,
} from "@/lib/auth/login-feedback";
import styles from "../admin.module.css";

const LOGIN_TIMEOUT_MS = 12_000;

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
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);
    try {
      const response = await fetch("/admin/login/session", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setMessage(
          loginFeedbackMessage(
            loginFeedbackFromResponse(payload, response.status),
          ),
        );
        return;
      }
      window.location.replace("/admin");
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Xác minh đăng nhập mất quá nhiều thời gian. Vui lòng thử lại."
          : "Hệ thống đăng nhập tạm thời không khả dụng.",
      );
    } finally {
      window.clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  return (
    <form
      className={styles.form}
      data-admin-pending="manual"
      onSubmit={handleSubmit}
    >
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
          aria-describedby="admin-login-message"
          required
        />
      </label>
      <button className={styles.submit} type="submit" disabled={submitting}>
        {submitting ? "Đang xác minh…" : "Đăng nhập"}
      </button>
      <p
        className={styles.message}
        id="admin-login-message"
        role="alert"
        aria-live="assertive"
      >
        {message}
      </p>
    </form>
  );
}
