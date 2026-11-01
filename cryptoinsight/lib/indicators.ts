// Pure technical indicator functions. All inputs are arrays of numbers,
// oldest first.

export interface Candle {
  t: number; // ms timestamp
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export function closes(candles: Candle[]): number[] {
  return candles.map((c) => c.c);
}

/** RSI with Wilder's smoothing, period 14. Returns 0-100 or null. */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  // Initial average over the first `period` price changes.
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  // Wilder's smoothing across the remaining history.
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
  }
  if (loss === 0) return 100;
  const rs = gain / loss;
  return 100 - 100 / (1 + rs);
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

/** ATR(14) expressed as a percent of the latest close. */
export function atrPct(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    trs.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }
  const recent = trs.slice(-period);
  const atr = recent.reduce((a, b) => a + b, 0) / period;
  const price = candles[candles.length - 1].c;
  return price > 0 ? (atr / price) * 100 : null;
}

/** Realized volatility from hourly closes, as percent. Used when true
 *  OHLC ranges are unavailable (e.g. CoinGecko fallback). */
export function realizedVolPct(values: number[], period = 24): number | null {
  if (values.length < period + 1) return null;
  const rets: number[] = [];
  for (let i = values.length - period; i < values.length; i++) {
    rets.push(Math.abs(values[i] / values[i - 1] - 1));
  }
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  return mean * 100;
}

export function changePct(values: number[], lookback: number): number | null {
  if (values.length <= lookback) return null;
  const now = values[values.length - 1];
  const then = values[values.length - 1 - lookback];
  return then > 0 ? (now / then - 1) * 100 : null;
}

export function highLow(values: number[]): { high: number; low: number } | null {
  if (values.length === 0) return null;
  let high = -Infinity;
  let low = Infinity;
  for (const v of values) {
    if (v > high) high = v;
    if (v < low) low = v;
  }
  return { high, low };
}

export interface SRLevels {
  support: number;
  resistance: number;
  supportTouches: number;
  resistanceTouches: number;
}

/** Support and resistance zones from swing pivots in a close series.
 *  Pivot highs/lows (local extremes over a small window) are clustered
 *  when they land within 1.5% of each other; the strongest cluster below
 *  the current price is support, the strongest above it is resistance.
 *  Falls back to the window low/high when no cluster qualifies, so the
 *  result is always derived from the real series, never invented.
 *  Returns null when the series is too short to say anything honest. */
export function supportResistance(values: number[]): SRLevels | null {
  const pts = values.filter((v) => isFinite(v) && v > 0);
  if (pts.length < 30) return null;
  const price = pts[pts.length - 1];
  const win = 5;
  const lows: number[] = [];
  const highs: number[] = [];
  for (let i = win; i < pts.length - win; i++) {
    let isLow = true;
    let isHigh = true;
    for (let j = i - win; j <= i + win; j++) {
      if (pts[j] < pts[i]) isLow = false;
      if (pts[j] > pts[i]) isHigh = false;
    }
    if (isLow) lows.push(pts[i]);
    if (isHigh) highs.push(pts[i]);
  }
  const tol = 0.015;
  function bestCluster(cands: number[], below: boolean): { level: number; touches: number } | null {
    let best: { level: number; touches: number } | null = null;
    for (const c of cands) {
      if (below ? c >= price : c <= price) continue;
      const members = cands.filter((v) => Math.abs(v / c - 1) <= tol);
      if (!best || members.length > best.touches) {
        best = { level: members.reduce((a, b) => a + b, 0) / members.length, touches: members.length };
      }
    }
    return best;
  }
  const s = bestCluster(lows, true);
  const r = bestCluster(highs, false);
  const winLow = Math.min(...pts);
  const winHigh = Math.max(...pts);
  // Each side stands on its own: use the pivot cluster when one exists,
  // otherwise the window extreme on that side. In a trending series
  // price sits at one edge of its range, so the extreme on that side is
  // the level price is testing, and the cluster on the other side is
  // still a real swing zone.
  const support = s ? s.level : winLow;
  const resistance = r ? r.level : winHigh;
  if (support < resistance && support <= price && resistance >= price) {
    return {
      support,
      resistance,
      supportTouches: s?.touches ?? 1,
      resistanceTouches: r?.touches ?? 1,
    };
  }
  return null;
}

/** Returns true when half or more of the last 24 candles have zero volume,
 *  meaning the series is too thin to trust. */
export function isThinSeries(candles: Candle[]): boolean {
  const tail = candles.slice(-24);
  if (tail.length === 0) return true;
  const zeroVol = tail.filter((c) => c.v <= 0).length;
  return zeroVol >= Math.ceil(tail.length / 2);
}
