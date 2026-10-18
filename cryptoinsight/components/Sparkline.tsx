"use client";

export default function Sparkline({
  closes,
  width = 220,
  height = 56,
}: {
  closes: number[];
  width?: number;
  height?: number;
}) {
  if (!closes || closes.length < 2) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const pts = closes.map((c, i) => {
    const x = (i / (closes.length - 1)) * width;
    const y = height - ((c - min) / span) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = closes[closes.length - 1] >= closes[0];
  const color = up ? "var(--green)" : "var(--red)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ display: "block", width: "100%", height: "auto" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
