import Link from "next/link";
import styles from "./landing.module.css";
import { MODULES } from "@/modules";

export const metadata = {
  title: "Candour — run your whole business in one light app",
  description: "CRM, invoicing, cash flow and your team in one place. Built for entrepreneurs. Get paid faster over WhatsApp.",
};

function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="24" cy="24" r="16.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M31 15.5a11 11 0 1 0 0 17" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 13.5v21M17.5 24h13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className={styles.page}>
      <div className={styles.promo}>
        <span className={styles.promoPill}>LIGHT ERP</span>
        <span className={styles.promoText}>Get paid faster and run leaner — built for founders.</span>
        <Link href="/signup" className={styles.promoCta}>Start free →</Link>
      </div>

      <header className={styles.nav}>
        <div className={styles.brand} style={{ color: "#fff" }}>
          <Mark />
          <span className={styles.brandName}>CANDOUR</span>
        </div>
        <nav className={styles.navLinks}>
          <Link href="#modules">Modules</Link>
          <Link href="#modules">Features</Link>
          <Link href="/login">Pricing</Link>
        </nav>
        <div className={styles.navRight}>
          <Link href="/login" className={styles.login}>Log in</Link>
          <Link href="/signup" className={styles.btn}>Start free →</Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroPanel}>
            <p className={styles.eyebrow}>FREE 30-DAY TRIAL · NO CARD NEEDED</p>
            <h1 className={styles.headline}>Run your whole business.<br />In one light app.</h1>
            <p className={styles.sub}>
              CRM, invoicing, cash flow and your team — captured in minutes, not spreadsheets.
              Send invoices and get paid faster over WhatsApp.
            </p>
            <Link href="/signup" className={styles.ctaBig}>Start free →</Link>
            <p className={styles.note}>Cancel anytime · set up in 60 seconds</p>
          </div>
        </section>

        <section id="modules" className={styles.features}>
          <h2 className={styles.featuresTitle}>Everything your business needs</h2>
          <p className={styles.featuresSub}>Start with the essentials, switch on more as you grow.</p>
          <div className={styles.grid}>
            {MODULES.map((m) => (
              <div key={m.slug} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.cardName}>{m.name}</span>
                  <span className={m.status === "available" ? styles.badgeReady : styles.badgeSoon}>
                    {m.status === "available" ? "READY" : "SOON"}
                  </span>
                </div>
                <span className={styles.cardDesc}>{m.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>© 2026 Candour · Built for entrepreneurs</footer>
    </div>
  );
}
