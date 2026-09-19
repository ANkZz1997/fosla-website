import * as cheerio from "cheerio";
import type { ListingItem } from "../types";
import { fetchText } from "../http";
import { clean } from "../util";
import { makeItem } from "./common";

export const HIMEXAM_URL = "https://himexam.com/latest-hp-govt-jobs-notifications-2023/";

/** himexam renders every job as <div class="job-card"> with a title, a date line and an "Apply Now" link. */
export function parseHimexam(html: string, limit = 30): ListingItem[] {
  const $ = cheerio.load(html);
  const out: ListingItem[] = [];
  $(".job-card").each((_, el) => {
    if (out.length >= limit) return false;
    const title = clean($(el).find("p.job-title").first().text());
    const href = $(el).find(".job-action a").first().attr("href");
    if (!title || !href) return;
    const dateText = clean($(el).find("p.job-date").first().text());
    const m = dateText.match(/^(last date|interview date|walk[- ]in date|exam date)\s*[-:–]?\s*(.+)$/i);
    out.push(
      makeItem("himexam", {
        title,
        url: new URL(href, HIMEXAM_URL).toString(),
        // Everything on this page is a Himachal Pradesh notification.
        hp: true,
        category: "job",
        dateLabel: m ? m[1].replace(/\b\w/g, (c) => c.toUpperCase()) : undefined,
        lastDate: m ? m[2] : dateText || undefined,
      }),
    );
  });
  return out;
}

export async function fetchHimexam(): Promise<ListingItem[]> {
  return parseHimexam(await fetchText(HIMEXAM_URL));
}
