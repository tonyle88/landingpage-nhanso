import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="admin-login-title">
        <div className={styles.brand}>
          <Image
            src="/assets/images/logo2.png"
            width={50}
            height={50}
            alt=""
            priority
          />
          <div>
            <strong>Clow Cat Patronus</strong>
            <span>Admin Console · Supabase staging</span>
          </div>
        </div>
        <p className={styles.eyebrow}>Quản trị bảo mật</p>
        <h1 className={styles.title} id="admin-login-title">
          Đăng nhập
        </h1>
        <p className={styles.description}>
          Chỉ tài khoản được mời và đã được cấp vai trò mới có thể truy cập.
        </p>
        {reason === "unauthorized" ? (
          <p className={styles.notice}>
            Phiên đăng nhập không hợp lệ hoặc tài khoản chưa được cấp quyền.
          </p>
        ) : null}
        <LoginForm />
        <p className={styles.securityNote}>
          Phiên được quản lý bằng cookie; trang này không cung cấp đăng ký mới.
        </p>
      </section>
    </main>
  );
}
