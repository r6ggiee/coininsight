"use client";

export type AssetType = "crypto" | "stocks";

/** Segmented Crypto/Stocks toggle. Sits at the top of the Research page
 *  and switches everything below it: picker, search, and brief. */
export default function AssetToggle({
  value,
  onChange,
}: {
  value: AssetType;
  onChange: (v: AssetType) => void;
}) {
  return (
    <div className="asset-toggle" role="group" aria-label="Asset type">
      {(["crypto", "stocks"] as const).map((t) => (
        <button
          key={t}
          type="button"
          className={`asset-toggle-btn${value === t ? " selected" : ""}`}
          aria-pressed={value === t}
          onClick={() => onChange(t)}
        >
          {t === "crypto" ? "Crypto" : "Stocks"}
        </button>
      ))}
    </div>
  );
}
