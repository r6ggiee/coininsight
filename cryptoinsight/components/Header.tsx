"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/research", label: "Research" },
  { href: "/compare", label: "Compare" },
  { href: "/markets", label: "Markets" },
  { href: "/scorecard", label: "Scorecard" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu on navigation and on Escape.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="CryptoInsight home">
          <span className="wordmark">CRYPTOINSIGHT</span>
          <span className="subline">Layered crypto research</span>
        </Link>
        <nav className="nav nav-desktop" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "active" : ""}
              aria-current={pathname === l.href ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <button
          className="menu-btn"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>
        <ThemeToggle />
      </div>
      {menuOpen && (
        <nav id="mobile-menu" className="nav-dropdown" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "active" : ""}
              aria-current={pathname === l.href ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
