// Shareable brief cards: client-side canvas render, zero dependencies.
// 1200x630 PNG styled on-brand (dark navy, #000388 accents, white text).
// System fonts only, so the render is reliable everywhere.

import type { Brief } from "./brief";
import { fmtPrice, fmtPct } from "./brief";
import { changePct } from "./indicators";

export const CARD_W = 1200;
export const CARD_H = 630;

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) return lines;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(+d)) return "date unavailable";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Render the brief as a 1200x630 share card canvas. Pure client-side. */
export function renderShareCard(brief: Brief): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");

  const s = brief.stats;
  const pad = 64;
  const contentW = CARD_W - pad * 2;

  // Background.
  ctx.fillStyle = "#0a0c18";
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // Accent bar.
  ctx.fillStyle = "#000388";
  ctx.fillRect(0, 0, CARD_W, 14);
  // Subtle bottom glow strip.
  ctx.fillStyle = "#000388";
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, CARD_H - 8, CARD_W, 8);
  ctx.globalAlpha = 1;

  let y = pad + 18;

  // Wordmark.
  ctx.fillStyle = "#8b96ff";
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText("C R Y P T O I N S I G H T", pad, y);
  y += 74;

  // Coin name + symbol.
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 62px ${FONT}`;
  ctx.fillText(`${brief.name} (${brief.coin})`, pad, y);
  y += 66;

  // Verdict headline, wrapped to at most 2 lines.
  ctx.fillStyle = "#c9d2f5";
  ctx.font = `400 38px ${FONT}`;
  const vlines = wrapText(ctx, brief.verdict, contentW, 2);
  for (const ln of vlines) {
    ctx.fillText(ln, pad, y);
    y += 50;
  }
  y += 22;

  // Price + 24h change.
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 58px ${FONT}`;
  const priceText = `$${fmtPrice(s.price)}`;
  ctx.fillText(priceText, pad, y);
  const priceW = ctx.measureText(priceText).width;
  const chg = s.change24h;
  if (chg !== null && isFinite(chg)) {
    ctx.fillStyle = chg >= 0 ? "#3ddc84" : "#ff7070";
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText(fmtPct(chg), pad + priceW + 28, y - 4);
  }
  y += 84;

  // Divider.
  ctx.strokeStyle = "rgba(139,150,255,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(pad + contentW, y);
  ctx.stroke();
  y += 46;

  // Stat blocks: RSI, funding rate, 7d change, volatility.
  // 7d change needs ~7 days of hourly data (168 points); use up to 168h
  // back so an exact week of data counts instead of showing n/a.
  const nCloses = brief.closes.length;
  const chg7 = s && nCloses >= 160 ? changePct(brief.closes, Math.min(168, nCloses - 1)) : null;
  const stats: Array<{ label: string; value: string; color?: string }> = [
    { label: "RSI (14)", value: s.rsi === null ? "n/a" : s.rsi.toFixed(0) },
    { label: "Funding / hr", value: fmtPct(s.fundingRatePct) },
    {
      label: "7d change",
      value: fmtPct(chg7),
      color: chg7 === null ? undefined : chg7 >= 0 ? "#3ddc84" : "#ff7070",
    },
    {
      label: "Volatility",
      value: s.volPct === null ? "n/a" : `${s.volPct.toFixed(2)}%`,
    },
  ];
  const colW = contentW / stats.length;
  stats.forEach((st, i) => {
    const x = pad + i * colW;
    ctx.fillStyle = "#8b96ff";
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(st.label.toUpperCase(), x, y);
    ctx.fillStyle = st.color ?? "#ffffff";
    ctx.font = `700 42px ${FONT}`;
    ctx.fillText(st.value, x, y + 52);
  });
  y += 130;

  // Footer: date + disclaimer.
  ctx.fillStyle = "#8b96ff";
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText(`Brief date: ${fmtDate(brief.asOf)}`, pad, y);
  const disc = "Not financial advice";
  ctx.fillText(disc, pad + contentW - ctx.measureText(disc).width, y);

  return canvas;
}

/** Turn a canvas into a PNG blob. */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode PNG"))),
      "image/png"
    );
  });
}

/** Download the PNG. */
export function downloadPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return canvasToPngBlob(canvas).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  });
}

/** Share via the Web Share API where supported; returns true if shared. */
export async function sharePng(canvas: HTMLCanvasElement, filename: string): Promise<boolean> {
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
  };
  try {
    const blob = await canvasToPngBlob(canvas);
    const file = new File([blob], filename, { type: "image/png" });
    if (nav.canShare && nav.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: "CryptoInsight brief" });
      return true;
    }
    return false;
  } catch (e: any) {
    // User dismissed the share sheet: do not fall back to a download.
    if (e && (e.name === "AbortError" || e.name === "NotAllowedError")) return true;
    return false;
  }
}
