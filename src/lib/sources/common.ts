import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import type { Category, ListingItem, SourceId } from "../types";
import { categorize, clean, dedupeKey, isHimachal, normalizeUrl, shortHash, vacanciesFromTitle } from "../util";

type Draft = Partial<ListingItem> & { title: string; url: string };

export function makeItem(source: SourceId, d: Draft): ListingItem {
  const title = clean(cheerio.load(`<p>${d.title}</p>`)("p").text());
  const category: Category = d.category ?? categorize(title);
  const vacancies = d.vacancies ?? vacanciesFromTitle(title);
  return {
    ...d,
    id: shortHash(normalizeUrl(d.url)),
    key: dedupeKey(title, category, vacancies),
    source,
    title,
    url: d.url,
    category,
    vacancies,
    hp: d.hp ?? isHimachal(title, d.teaser),
  };
}

const xml = new XMLParser({ ignoreAttributes: true, processEntities: true, trimValues: true });

export interface FeedEntry {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

export function parseRss(body: string): FeedEntry[] {
  const doc = xml.parse(body);
  const raw = doc?.rss?.channel?.item;
  const items: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return items
    .map((i) => ({
      title: clean(String(i.title ?? "")),
      link: clean(String(i.link ?? "")),
      pubDate: i.pubDate ? new Date(i.pubDate).toISOString() : undefined,
      description: clean(cheerio.load(`<div>${String(i.description ?? "")}</div>`)("div").text()),
    }))
    .filter((e) => e.title && e.link);
}
