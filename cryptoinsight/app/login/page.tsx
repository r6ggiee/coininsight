import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in: CryptoInsight",
  description: "Sign in or create a CryptoInsight account to sync your watchlist and settings.",
};

export default function LoginPage() {
  return (
    <div>
      <div className="section-head">
        <h2>Account</h2>
      </div>
      <Suspense fallback={<div className="card" style={{ maxWidth: "26rem", margin: "0 auto" }}><p className="muted">Loading</p></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
