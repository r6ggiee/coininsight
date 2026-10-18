import type { Metadata } from "next";
import SettingsForm from "@/components/SettingsForm";

export const metadata: Metadata = {
  title: "Settings: CryptoInsight",
  description: "Your CryptoInsight account settings: profile and appearance.",
};

export default function SettingsPage() {
  return (
    <div>
      <div className="section-head">
        <h2>Settings</h2>
        <p>Your profile and how the site looks.</p>
      </div>
      <SettingsForm />
    </div>
  );
}
