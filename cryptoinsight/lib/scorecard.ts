// Brief Scorecard: tracks whether brief leans were right. SERVER-SIDE ONLY.
//
// Every refresh records one entry per built-in coin per UTC day (lean +
// price). Entries older than 24h get scored against the current price.
// Entries live in data/scores.json, which is gitignored.
//
// Honest limitation: on serverless hosts the JSON file resets on
// redeploy or instance recycle, so history there is short-lived. A durable
// store (Vercel KV, Postgres) is the documented upgrade path. Local dev
// and single-instance hosts persist fine.

import fs from "fs";
import path from "path";
import type { Lean } from "./brief";

export type { Lean };
export type Outcome = "right" | "wrong";

export interface ScoreEntry {
  coin: string;
  briefAt: string; // ISO timestamp
  lean: Lean;
  priceAtBrief: number;
  scoredAt?: string; // ISO timestamp, set when scored
  priceAtScore?: number;
  outcome?: Outcome;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "scores.json");

const DAY_MS = 24 * 60 * 60 * 1000;

function load(): ScoreEntry[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: ScoreEntry[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), "utf8");
}

/** UTC calendar day, e.g. "2026-10-17". */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Record one entry per coin per UTC day. Returns false when an entry for
 *  that coin and day already exists (the first refresh of the day wins). */
export function recordDaily(
  coin: string,
  lean: Lean,
  priceAtBrief: number,
  now: Date = new Date()
): boolean {
  if (!(priceAtBrief > 0)) return false;
  const entries = load();
  const day = dayKey(now.toISOString());
  const exists = entries.some((e) => e.coin === coin && dayKey(e.briefAt) === day);
  if (exists) return false;
  entries.push({ coin, briefAt: now.toISOString(), lean, priceAtBrief });
  save(entries);
  return true;
}

/** Score every unscored entry older than 24h. getPrice returns the current
 *  price for a coin id, or null when unavailable. Returns how many entries
 *  were scored. */
export function scoreDue(
  getPrice: (coin: string) => number | null,
  now: Date = new Date()
): number {
  const entries = load();
  const cutoff = now.getTime() - DAY_MS;
  let scored = 0;
  for (const e of entries) {
    if (e.outcome) continue;
    if (new Date(e.briefAt).getTime() > cutoff) continue;
    const price = getPrice(e.coin);
    if (!(price !== null && price > 0) || !(e.priceAtBrief > 0)) continue;
    const move = price / e.priceAtBrief - 1;
    let right: boolean;
    if (e.lean === "bullish") right = move > 0.005;
    else if (e.lean === "bearish") right = move < -0.005;
    else right = Math.abs(move) < 0.01;
    e.outcome = right ? "right" : "wrong";
    e.scoredAt = now.toISOString();
    e.priceAtScore = price as number;
    scored++;
  }
  if (scored > 0) save(entries);
  return scored;
}

export interface CoinScore {
  coin: string;
  scored: number;
  right: number;
  hitRate: number | null; // null when nothing scored yet
}

export interface ScorecardSummary {
  overall: { scored: number; right: number; hitRate: number | null };
  byCoin: CoinScore[];
  recent: ScoreEntry[]; // last 20 scored, newest first
}

export function getSummary(): ScorecardSummary {
  const entries = load();
  const scored = entries.filter((e) => e.outcome === "right" || e.outcome === "wrong");
  const right = scored.filter((e) => e.outcome === "right").length;
  const coins: string[] = [];
  for (const e of scored) {
    if (!coins.includes(e.coin)) coins.push(e.coin);
  }
  coins.sort();
  const byCoin: CoinScore[] = coins.map((coin) => {
    const s = scored.filter((e) => e.coin === coin);
    const r = s.filter((e) => e.outcome === "right").length;
    return { coin, scored: s.length, right: r, hitRate: s.length > 0 ? r / s.length : null };
  });
  const recent = [...scored]
    .sort((a, b) => (b.scoredAt || "").localeCompare(a.scoredAt || ""))
    .slice(0, 20);
  return {
    overall: {
      scored: scored.length,
      right,
      hitRate: scored.length > 0 ? right / scored.length : null,
    },
    byCoin,
    recent,
  };
}
