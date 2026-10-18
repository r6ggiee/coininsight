import { Suspense } from "react";
import type { Metadata } from "next";
import ResearchClient from "@/components/ResearchClient";

export const metadata: Metadata = {
  title: "Research: CryptoInsight",
  description: "Generate a layered crypto research brief for any coin.",
};

export default function ResearchPage() {
  return (
    <Suspense
      fallback={
        <div className="skeleton-block" aria-label="Loading research page">
          <div className="skeleton" style={{ height: "2rem", width: "40%" }} />
          <div className="skeleton" style={{ height: "3rem" }} />
          <div className="skeleton" style={{ height: "3rem" }} />
        </div>
      }
    >
      <ResearchClient />
    </Suspense>
  );
}
