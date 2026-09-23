import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { surveyCopyWithDefaults } from "@/lib/survey";
import { createServiceServerClient } from "@/lib/supabase/server";
import styles from "../../survey.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cảm ơn em đã chia sẻ | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default async function SurveyThanksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceServerClient();
  const { data: survey } = supabase && /^[0-9a-f-]{36}$/i.test(id)
    ? await supabase.from("service_surveys").select("display_copy").eq("id", id).maybeSingle()
    : { data: null };
  const copy = surveyCopyWithDefaults(survey?.display_copy);
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
        <span className={styles.kicker}>{copy.thanksEyebrow}</span>
        <h1>{copy.thanksTitle}</h1>
        <p>{copy.thanksDescription}</p>
        <Link href="/">{copy.thanksBackLabel} <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
