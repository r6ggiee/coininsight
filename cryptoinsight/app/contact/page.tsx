import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact: CryptoInsight",
  description: "Get in touch with CryptoInsight. Feedback, bug reports, and business inquiries welcome.",
};

export default function ContactPage() {
  return (
    <div>
      <div className="section-head">
        <h2>Contact</h2>
        <p>Get in touch.</p>
      </div>

      <section className="card">
        <h3>Email</h3>
        <p>
          Feedback, bug reports, and business inquiries are all welcome.
        </p>
        <p>
          <a href="mailto:reggielabon72@gmail.com">reggielabon72@gmail.com</a>
        </p>
      </section>

      <div className="disclaimer-box" style={{ marginTop: "1.5rem" }}>
        Educational research only - not financial advice. No buy/sell recommendation is made or implied.
      </div>
    </div>
  );
}
