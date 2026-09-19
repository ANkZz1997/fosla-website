import * as cheerio from "cheerio";
import type { ListingItem } from "../types";
import { fetchText } from "../http";
import { clean } from "../util";
import { makeItem, parseRss } from "./common";

export const FJA_HP_URL = "https://www.freejobalert.com/hp-government-jobs/";
export const FJA_FEED = "https://www.freejobalert.com/feed/";

/** The HP page is a table: date, title, post name, vacancies, qualification, last date. */
export function parseFjaHpTable(html: string, limit = 30): ListingItem[] {
  const $ = cheerio.load(html);
  const out: ListingItem[] = [];
  $("table.kar-jobs tbody tr").each((_, tr) => {
    if (out.length >= limit) return false;
    const a = $(tr).find("td.kar-c-title a").first();
    const href = a.attr("href");
    const title = clean(a.find(".kar-t-desk").first().text()) || clean(a.text());
    if (!href || !title) return;
    const post = clean($(tr).find("td.kar-c-post").text());
    const qual = clean($(tr).find("td.kar-c-qual").text());
    const vac = clean($(tr).find("td.kar-c-vac").text()).match(/[\d,]+/)?.[0];
    const last = clean($(tr).find("td.kar-c-last").text());
    const posted = clean($(tr).find("td.kar-c-date").text()).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    out.push(
      makeItem("freejobalert", {
        title,
        url: href,
        hp: true,
        category: "job",
        vacancies: vac ? Number(vac.replace(/,/g, "")) : undefined,
        lastDate: last || undefined,
        dateLabel: "Last Date",
        publishedAt: posted ? new Date(`${posted[3]}-${posted[2]}-${posted[1]}T00:00:00+05:30`).toISOString() : undefined,
        teaser: [post && `Post: ${post}`, qual && `Qualification: ${qual}`].filter(Boolean).join(" | ") || undefined,
      }),
    );
  });
  return out;
}

export function parseFjaFeed(body: string, limit = 40): ListingItem[] {
  return parseRss(body)
    .slice(0, limit)
    .map((e) => makeItem("freejobalert", { title: e.title, url: e.link, publishedAt: e.pubDate, teaser: e.description }));
}

export async function fetchFreeJobAlert(): Promise<ListingItem[]> {
  const [hp, feed] = await Promise.allSettled([fetchText(FJA_HP_URL), fetchText(FJA_FEED)]);
  const items: ListingItem[] = [];
  if (hp.status === "fulfilled") items.push(...parseFjaHpTable(hp.value));
  if (feed.status === "fulfilled") items.push(...parseFjaFeed(feed.value));
  if (!items.length) {
    const reason = hp.status === "rejected" ? hp.reason : feed.status === "rejected" ? feed.reason : "no items";
    throw reason instanceof Error ? reason : new Error(String(reason));
  }
  return items;
}
