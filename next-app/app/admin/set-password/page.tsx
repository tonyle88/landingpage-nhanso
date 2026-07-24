import type { Metadata } from "next";
import Image from "next/image";
import { SetPasswordForm } from "./set-password-form";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đặt mật khẩu quản trị | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default function SetPasswordPage() {
  return (
    <main className={styles.shell}>
      <section className={styles.card} aria-labelledby="set-password-title">
        <div className={styles.brand}>
          <Image src="/assets/images/logo2.png" width={50} height={50} alt="" priority />
          <div>
            <strong>Clow Cat Patronus</strong>
            <span>Admin Console · Supabase staging</span>
          </div>
        </div>
        <p className={styles.eyebrow}>Hoàn tất lời mời</p>
        <h1 className={styles.title} id="set-password-title">Đặt mật khẩu</h1>
        <p className={styles.description}>
          Liên kết chỉ dùng một lần. Mật khẩu được gửi thẳng tới Supabase và
          không được lưu trong ứng dụng.
        </p>
        <SetPasswordForm />
      </section>
    </main>
  );
}
