import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL to the production domain (e.g. https://cryptoinsight.xyz)
  // so social preview images resolve correctly. Falls back to a placeholder.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  title: "CryptoInsight: Layered crypto research",
  description:
    "Pick a coin, get a structured research brief. Plain-English summaries, real market data, honest labels. Educational research only, never financial advice.",
  openGraph: {
    title: "CryptoInsight: Layered crypto research",
    description:
      "Structured crypto research briefs for any experience level. Real data, plain English, no hype.",
    images: [{ url: "/art/og-image.jpg", width: 1200, height: 630 }],
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('ci-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Header />
        <main className="page">{children}</main>
        <footer className="site-footer">
          <div className="footer-inner">
            <div className="footer-brand">
              <span className="wordmark">CRYPTOINSIGHT</span>
              <span className="subline">Layered crypto research</span>
            </div>
            <p className="footer-disclaimer">
              Educational research only - not financial advice. No buy/sell recommendation is made or implied.
            </p>
            <p className="footer-note">Data refreshes daily from free public sources, and stale data is refreshed on demand.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
