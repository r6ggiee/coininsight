// News headlines from free RSS feeds, filtered per coin by keyword.
// SERVER-SIDE ONLY.

import { fetchText } from "./sources";

export interface Headline {
  title: string;
  outlet: string;
  url: string;
  publishedAt: string;
}

const FEEDS = [
  { url: "https://cointelegraph.com/rss", outlet: "CoinTelegraph" },
  { url: "https://decrypt.co/feed", outlet: "Decrypt" },
];

function stripCdata(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .trim();
}

function extractTag(body: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(body);
  return m ? stripCdata(m[1]) : "";
}

function parseRss(xml: string, outlet: string): Headline[] {
  const items: Headline[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const body = m[1];
    const title = extractTag(body, "title");
    const url = extractTag(body, "link");
    const publishedAt = extractTag(body, "pubDate") || extractTag(body, "dc:date");
    if (title && url) items.push({ title, outlet, url, publishedAt });
  }
  // Dedupe by URL, keep first occurrence.
  const seen = new Set<string>();
  return items.filter((h) => {
    if (seen.has(h.url)) return false;
    seen.add(h.url);
    return true;
  });
}

export async function fetchAllHeadlines(): Promise<Headline[]> {
  const all: Headline[] = [];
  for (const f of FEEDS) {
    try {
      const xml = await fetchText(f.url);
      all.push(...parseRss(xml, f.outlet));
    } catch {
      // One dead feed should not kill the section.
    }
  }
  // Dedupe by URL across feeds, keep first occurrence, newest first.
  const seen = new Set<string>();
  const deduped = all.filter((h) => {
    if (seen.has(h.url)) return false;
    seen.add(h.url);
    return true;
  });
  deduped.sort((a, b) => {
    const ta = a.publishedAt ? +new Date(a.publishedAt) : 0;
    const tb = b.publishedAt ? +new Date(b.publishedAt) : 0;
    return tb - ta;
  });
  return deduped;
}

/** First headline matching any keyword. Pass newest-first headlines. */
export function matchHeadline(headlines: Headline[], keywords: string[]): Headline | null {
  const kw = keywords.map((k) => k.toLowerCase()).filter(Boolean);
  if (kw.length === 0) return null;
  for (const h of headlines) {
    const t = h.title.toLowerCase();
    if (kw.some((k) => t.includes(k))) return h;
  }
  return null;
}

export async function fetchHeadlines(keywords: string[], limit = 5): Promise<Headline[]> {
  const all = await fetchAllHeadlines();
  const kw = keywords.map((k) => k.toLowerCase()).filter(Boolean);
  return all
    .filter((h) => {
      const t = h.title.toLowerCase();
      return kw.some((k) => t.includes(k));
    })
    .slice(0, limit);
}
