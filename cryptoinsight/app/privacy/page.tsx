import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy: CryptoInsight",
  description: "What CryptoInsight stores, what it does not, and who else is involved.",
};

export default function PrivacyPage() {
  return (
    <div>
      <div className="section-head">
        <h2>Privacy Policy</h2>
        <p>What we store, what we do not, and who else is involved.</p>
      </div>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>What we store</h3>
        <p>
          If you create an account, we store your email address and display name in Supabase, our
          account database. We also store your preferences, such as your theme setting, and any
          coins or stocks you add to your watchlist.
        </p>
        <p>
          Separately, the site saves a daily snapshot of each research brief it generates (the coin
          or ticker, the verdict, and the price at the time) so the public scorecard and past briefs
          can be shown. Those snapshots are about the market, not about you, and are not linked to
          your account.
        </p>
        <p>
          If you use the site without an account, your watchlist and theme choices stay in your own
          browser&apos;s local storage and never reach our database.
        </p>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>What we do not do</h3>
        <ul>
          <li>We do not sell your personal data. To anyone, ever.</li>
          <li>We do not run advertising trackers or share your data with advertisers.</li>
          <li>We do not store passwords. Supabase handles sign-in and stores credentials securely on its side.</li>
          <li>We do not collect payment information. There is nothing to buy here.</li>
        </ul>
      </section>

      <section className="card" style={{ marginBottom: "1.25rem" }}>
        <h3>Third parties involved</h3>
        <p>
          Market data comes from public providers: CoinGecko, Yahoo Finance, and Finnhub. Charts on
          brief pages are embedded from TradingView, which means your browser talks to TradingView
          directly when a chart loads. Accounts run on Supabase, and the site is hosted on Vercel.
          Each of those services has its own privacy policy covering the technical data (such as
          your IP address) that any website visit involves.
        </p>
      </section>

      <section className="card">
        <h3>Your choices</h3>
        <p>
          You can ask what we hold about you, ask us to correct it, or ask us to delete your account
          and its data entirely. Email{" "}
          <a href="mailto:reggielabon72@gmail.com">reggielabon72@gmail.com</a> with any privacy
          request and we will handle it directly.
        </p>
      </section>

      <div className="disclaimer-box" style={{ marginTop: "1.5rem" }}>
        Educational research only - not financial advice. No buy/sell recommendation is made or implied.
      </div>
    </div>
  );
}
