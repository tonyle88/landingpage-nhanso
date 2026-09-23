import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "../../survey.module.css";

export const metadata: Metadata = {
  title: "Cảm ơn em đã chia sẻ | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default function SurveyThanksPage() {
  return (
    <main className={`${styles.page} ${styles.thanksPage}`}>
      <div className={styles.ambient} aria-hidden="true">✦</div>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image src="/assets/images/logo2.png" width={46} height={46} alt="Clow Cat Patronus" />
          <span>Clow Cat Patronus</span>
        </Link>
      </header>
      <section className={styles.thanksCard}>
        <div className={styles.thanksSymbol} aria-hidden="true">✦</div>
        <span className={styles.kicker}>ĐÃ GỬI ĐÁNH GIÁ</span>
        <h1>Biết ơn em đã chia sẻ.</h1>
        <p>Những điều em viết là món quà quý giá để anh tiếp tục hoàn thiện nội dung và cách đồng hành cùng mỗi người trên hành trình hiểu mình.</p>
        <Link href="/">Trở về trang chủ <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
