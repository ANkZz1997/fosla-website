import * as cheerio from "cheerio";
import type { ListingItem, SourceId } from "../types";
import { fetchText } from "../http";
import { clean } from "../util";
import { makeItem, parseRss } from "./common";

/** Section/menu pages that are not individual posts. */
const NAV_SLUGS = new Set([
  "latest-jobs", "latest-job", "admit-card", "answer-key", "result", "results", "admission", "syllabus", "contact", "contact-us",
  "about", "about-us", "privacy-policy", "disclaimer", "dmca", "terms", "sitemap", "category", "tag", "page", "feed", "blog",
]);

/**
 * Sarkari-style WordPress sites: the feed has the newest few posts, and the homepage
 * lists many more as plain links whose text ends in a year ("... 2026") or "(N Posts)".
 */
export function parseWordpressHome(html: string, base: string, source: SourceId, limit = 40): ListingItem[] {
  const $ = cheerio.load(html);
  const host = new URL(base).hostname.replace(/^www\./, "");
  const seen = new Set<string>();
  const out: ListingItem[] = [];
  $("a[href]").each((_, a) => {
    if (out.length >= limit) return false;
    let url: URL;
    try {
      url = new URL($(a).attr("href")!, base);
    } catch {
      return;
    }
    if (url.hostname.replace(/^www\./, "") !== host) return;
    const segs = url.pathname.split("/").filter(Boolean);
    if (segs.length !== 1 || NAV_SLUGS.has(segs[0])) return;
    const title = clean($(a).text());
    if (title.length < 12 || !/(20\d\d|posts?\b|vacanc)/i.test(title)) return;
    if (seen.has(url.pathname)) return;
    seen.add(url.pathname);
    out.push(makeItem(source, { title, url: url.toString() }));
  });
  return out;
}

export async function fetchWordpress(source: SourceId, base: string): Promise<ListingItem[]> {
  const [feed, home] = await Promise.allSettled([fetchText(`${base}/feed/`), fetchText(`${base}/`)]);
  const items: ListingItem[] = [];
  if (home.status === "fulfilled") items.push(...parseWordpressHome(home.value, `${base}/`, source));
  if (feed.status === "fulfilled") {
    items.push(...parseRss(feed.value).map((e) => makeItem(source, { title: e.title, url: e.link, publishedAt: e.pubDate })));
  }
  if (!items.length) {
    const reason = home.status === "rejected" ? home.reason : feed.status === "rejected" ? feed.reason : "no items";
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
  return items;
}
