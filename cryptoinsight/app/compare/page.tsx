import { Suspense } from "react";
import type { Metadata } from "next";
import CompareClient from "@/components/CompareClient";

export const metadata: Metadata = {
  title: "Compare: CryptoInsight",
  description: "Two coins, same data, side by side. Factual only: no winners, no recommendations.",
};

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="skeleton-block" aria-label="Loading compare page">
          <div className="skeleton" style={{ height: "2rem", width: "40%" }} />
          <div className="skeleton" style={{ height: "3rem" }} />
          <div className="skeleton" style={{ height: "3rem" }} />
        </div>
      }
    >
      <CompareClient />
    </Suspense>
  );
}
