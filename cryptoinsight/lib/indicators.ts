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

/** Returns true when half or more of the last 24 candles have zero volume,
 *  meaning the series is too thin to trust. */
export function isThinSeries(candles: Candle[]): boolean {
  const tail = candles.slice(-24);
  if (tail.length === 0) return true;
  const zeroVol = tail.filter((c) => c.v <= 0).length;
  return zeroVol >= Math.ceil(tail.length / 2);
}
