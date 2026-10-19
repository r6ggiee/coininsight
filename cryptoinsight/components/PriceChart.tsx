"use client";

import { useMemo, useRef, useState } from "react";

/** Lightweight SVG line chart for hourly closes. Used whenever TradingView
 *  has no symbol for the coin (searched coins, thin listings). Styled to sit
 *  next to the TradingView embed without a jarring difference: accent line,
 *  muted grid, theme-aware via CSS variables. No dependencies. */

const W = 600;
const H = 320;
const PAD_L = 8;
const PAD_R = 64;
const PAD_T = 12;
const PAD_B = 24;

function fmtShort(v: number): string {
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (v >= 10) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toPrecision(3);
}

export default function PriceChart({ closes }: { closes: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const geom = useMemo(() => {
    const pts = closes.filter((c) => isFinite(c));
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    // Pad the range a touch so the line never touches the edges.
    const lo = min - span * 0.06;
    const hi = max + span * 0.06;
    const iw = W - PAD_L - PAD_R;
    const ih = H - PAD_T - PAD_B;
    const x = (i: number) => PAD_L + (i / (pts.length - 1)) * iw;
    const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * ih;
    const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    const area = `${line} L${x(pts.length - 1).toFixed(1)},${(PAD_T + ih).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T + ih).toFixed(1)} Z`;
    // 4 grid lines at quartiles of the padded range.
    const gridVals = [0.05, 0.35, 0.65, 0.95].map((f) => lo + (hi - lo) * f);
    const up = pts[pts.length - 1] >= pts[0];
    return { pts, line, area, gridVals, y, x, iw, ih, up };
  }, [closes]);

  if (!geom) return null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Map client X to viewBox X, accounting for responsive scaling.
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const frac = (vx - PAD_L) / geom.iw;
    const idx = Math.round(frac * (geom.pts.length - 1));
    if (idx >= 0 && idx < geom.pts.length) setHover(idx);
  };

  const hp = hover !== null ? { v: geom.pts[hover], x: geom.x(hover), y: geom.y(geom.pts[hover]) } : null;

  return (
    <div className="price-chart" role="img" aria-label="Price chart, hourly closes">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) onMove(t as unknown as React.MouseEvent<SVGSVGElement>);
        }}
        onTouchEnd={() => setHover(null)}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        {geom.gridVals.map((gv, i) => (
          <g key={i}>
            <line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={geom.y(gv)}
              y2={geom.y(gv)}
              className="pc-grid"
            />
            <text x={W - PAD_R + 6} y={geom.y(gv) + 4} className="pc-label">
              {fmtShort(gv)}
            </text>
          </g>
        ))}
        <path d={geom.area} className="pc-area" />
        <path d={geom.line} className="pc-line" fill="none" />
        {hp && (
          <g>
            <line x1={hp.x} x2={hp.x} y1={PAD_T} y2={H - PAD_B} className="pc-cross" />
            <circle cx={hp.x} cy={hp.y} r={4} className="pc-dot" />
            <text
              x={hp.x > W - 160 ? hp.x - 8 : hp.x + 8}
              y={Math.max(hp.y - 10, 14)}
              textAnchor={hp.x > W - 160 ? "end" : "start"}
              className="pc-tip"
            >
              ${fmtShort(hp.v)}
            </text>
          </g>
        )}
      </svg>
      <div className="pc-caption">
        Hourly closes{geom.up ? ", trending up" : ", trending down"} over the period
      </div>
    </div>
  );
}
