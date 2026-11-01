"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SRLevels } from "@/lib/indicators";
import { fmtPrice } from "@/lib/brief";

/** Trading Basics lesson 01: support and resistance, in the style of a
 *  30 second animated explainer. Unlike a schematic video, the chart is
 *  the asset's own real price history and the two zones are computed
 *  from its actual swing highs and lows (see supportResistance in
 *  lib/indicators.ts). Educational only, never a trading signal. */

const W = 600;
const H = 340;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 14;
const PAD_B = 14;
const MAX_CANDLES = 44;
const STEP_MS = 6000;

interface CandleBar {
  o: number;
  h: number;
  l: number;
  c: number;
}

function toCandles(closes: number[]): CandleBar[] {
  const pts = closes.filter((v) => isFinite(v) && v > 0);
  if (pts.length < 2) return [];
  const bucket = Math.max(1, Math.ceil(pts.length / MAX_CANDLES));
  const out: CandleBar[] = [];
  for (let i = 0; i < pts.length; i += bucket) {
    const slice = pts.slice(i, i + bucket);
    out.push({
      o: slice[0],
      h: Math.max(...slice),
      l: Math.min(...slice),
      c: slice[slice.length - 1],
    });
  }
  return out;
}

const STEP_TEXT = [
  {
    title: "Support and resistance in 30 seconds",
    sub: "The two levels almost every chart starts with, drawn here from this asset's own price history.",
  },
  {
    title: "Support = a floor",
    sub: "Price keeps dropping to the same area, then buyers step in and it bounces.",
  },
  {
    title: "Resistance = a ceiling",
    sub: "Price keeps rising to the same area, then sellers step in and it stalls.",
  },
  {
    title: "Broken ceilings can become floors",
    sub: "If price pushes through a ceiling and holds above it, that old ceiling can act as a floor on the way back down. Watch for the hold, not just the break.",
  },
  {
    title: "How to read them",
    sub: "Think zones, not exact lines. A level means more the more times price has reacted there, and no level holds forever.",
  },
];

export default function BasicsLesson({
  closes,
  symbol,
  levels,
  periodLabel,
}: {
  closes: number[];
  symbol: string;
  levels: SRLevels | null;
  periodLabel: string;
}) {
  const candles = useMemo(() => toCandles(closes), [closes]);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlaying(false);
      setStep(STEP_TEXT.length - 1);
      setProgress(1);
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 50 / STEP_MS;
        if (next >= 1) {
          setStep((s) => {
            if (s >= STEP_TEXT.length - 1) {
              setPlaying(false);
              return s;
            }
            return s + 1;
          });
          return 0;
        }
        return next;
      });
    }, 50);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  const geom = useMemo(() => {
    if (!levels || candles.length < 8) return null;
    const zonePad = 0.0075;
    const vals = candles.flatMap((k) => [k.h, k.l]);
    const lo = Math.min(...vals, levels.support * (1 - zonePad));
    const hi = Math.max(...vals, levels.resistance * (1 + zonePad));
    const span = hi - lo || 1;
    const yLo = lo - span * 0.05;
    const yHi = hi + span * 0.05;
    const iw = W - PAD_L - PAD_R;
    const ih = H - PAD_T - PAD_B;
    const y = (v: number) => PAD_T + (1 - (v - yLo) / (yHi - yLo)) * ih;
    const stepX = iw / candles.length;
    const x = (i: number) => PAD_L + stepX * i + stepX / 2;
    // Touch points: local extremes that land inside a zone.
    const sTop = levels.support * (1 + zonePad);
    const sBot = levels.support * (1 - zonePad);
    const rTop = levels.resistance * (1 + zonePad);
    const rBot = levels.resistance * (1 - zonePad);
    const sTouches: number[] = [];
    const rTouches: number[] = [];
    candles.forEach((k, i) => {
      const prev = candles[Math.max(0, i - 1)];
      const next = candles[Math.min(candles.length - 1, i + 1)];
      if (k.l >= sBot && k.l <= sTop && k.l <= prev.l && k.l <= next.l) sTouches.push(i);
      if (k.h >= rBot && k.h <= rTop && k.h >= prev.h && k.h >= next.h) rTouches.push(i);
    });
    return { y, x, stepX, sTouches: sTouches.slice(0, 4), rTouches: rTouches.slice(0, 4), sTop, sBot, rTop, rBot };
  }, [candles, levels]);

  if (!levels || !geom) return null;

  const reveal = step === 0 ? Math.max(2, Math.ceil(progress * candles.length)) : candles.length;
  const shown = candles.slice(0, reveal);
  const text = STEP_TEXT[step];
  const bodyW = Math.max(3, geom.stepX * 0.62);

  const jump = (i: number) => {
    setStep(i);
    setProgress(0);
    setPlaying(i < STEP_TEXT.length - 1);
  };
  const replay = () => {
    setStep(0);
    setProgress(0);
    setPlaying(true);
  };

  return (
    <div className="basics-lesson" aria-label="Trading Basics lesson: support and resistance">
      <div className="basics-head">
        <span>TRADING BASICS &middot; 01</span>
        <span className="basics-head-r">SUPPORT / RESISTANCE</span>
      </div>
      <div className="basics-progress" role="tablist" aria-label="Lesson steps">
        {STEP_TEXT.map((_, i) => (
          <button
            key={i}
            type="button"
            className="basics-seg"
            aria-label={`Step ${i + 1}`}
            onClick={() => jump(i)}
          >
            <span
              className="basics-seg-fill"
              style={{ width: i < step ? "100%" : i === step ? `${Math.round(progress * 100)}%` : "0%" }}
            />
          </button>
        ))}
      </div>

      <h4 className="basics-title">{text.title}</h4>
      <p className="basics-sub">{text.sub}</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="basics-svg" role="img" aria-label={`${symbol} price chart with support and resistance zones`}>
        {/* zones */}
        {step >= 2 && (
          <g>
            <rect x={PAD_L} width={W - PAD_L - PAD_R} y={geom.y(geom.rTop)} height={Math.max(2, geom.y(geom.rBot) - geom.y(geom.rTop))} className="sr-zone-res" />
            <line x1={PAD_L} x2={W - PAD_R} y1={geom.y(levels.resistance)} y2={geom.y(levels.resistance)} className="sr-line-res" />
          </g>
        )}
        {step >= 1 && (
          <g>
            <rect x={PAD_L} width={W - PAD_L - PAD_R} y={geom.y(geom.sTop)} height={Math.max(2, geom.y(geom.sBot) - geom.y(geom.sTop))} className="sr-zone-sup" />
            <line x1={PAD_L} x2={W - PAD_R} y1={geom.y(levels.support)} y2={geom.y(levels.support)} className="sr-line-sup" />
          </g>
        )}

        {/* candles */}
        {shown.map((k, i) => {
          const up = k.c >= k.o;
          const cx = geom.x(i);
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={geom.y(k.h)} y2={geom.y(k.l)} className={up ? "sr-wick-up" : "sr-wick-down"} />
              <rect
                x={cx - bodyW / 2}
                width={bodyW}
                y={geom.y(Math.max(k.o, k.c))}
                height={Math.max(1.5, Math.abs(geom.y(k.o) - geom.y(k.c)))}
                className={up ? "sr-body-up" : "sr-body-down"}
              />
            </g>
          );
        })}

        {/* touch markers + labels */}
        {step >= 1 &&
          geom.sTouches.map((i) =>
            i < reveal ? (
              <circle key={`s${i}`} cx={geom.x(i)} cy={geom.y(candles[i].l)} r={7} className="sr-touch-sup" />
            ) : null
          )}
        {step >= 2 &&
          geom.rTouches.map((i) =>
            i < reveal ? (
              <circle key={`r${i}`} cx={geom.x(i)} cy={geom.y(candles[i].h)} r={7} className="sr-touch-res" />
            ) : null
          )}
        {step >= 1 && (
          <text x={PAD_L + 6} y={geom.y(levels.support) + 22} className="sr-tag-sup">
            SUPPORT &middot; BUYERS STEP IN &middot; ${fmtPrice(levels.support)}
          </text>
        )}
        {step >= 2 && (
          <text x={PAD_L + 6} y={geom.y(levels.resistance) - 10} className="sr-tag-res">
            RESISTANCE &middot; SELLERS STEP IN &middot; ${fmtPrice(levels.resistance)}
          </text>
        )}
        {step >= 3 && (
          <text x={W - PAD_R - 6} y={geom.y(levels.resistance) + 22} textAnchor="end" className="sr-tag-flip">
            OLD CEILING CAN BECOME A NEW FLOOR
          </text>
        )}
      </svg>

      {step >= 4 && (
        <div className="basics-readout">
          <span className="basics-chip sup">
            Support zone near ${fmtPrice(levels.support)} &middot; {levels.supportTouches} swing low{levels.supportTouches === 1 ? "" : "s"} in range
          </span>
          <span className="basics-chip res">
            Resistance zone near ${fmtPrice(levels.resistance)} &middot; {levels.resistanceTouches} swing high{levels.resistanceTouches === 1 ? "" : "s"} in range
          </span>
        </div>
      )}

      <div className="basics-controls">
        {playing ? (
          <button type="button" className="btn btn-ghost" onClick={() => setPlaying(false)}>
            Pause
          </button>
        ) : step === STEP_TEXT.length - 1 && progress >= 1 ? (
          <button type="button" className="btn btn-ghost" onClick={replay}>
            Replay lesson
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setPlaying(true)}>
            Play
          </button>
        )}
        <span className="basics-foot">
          Real chart: {symbol}, {periodLabel} &middot; Zones from swing highs and lows in that window &middot; Educational only &middot; Not financial advice
        </span>
      </div>
    </div>
  );
}
