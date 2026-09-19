import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseHimexam } from "@/lib/sources/himexam";
import { parseFjaFeed, parseFjaHpTable } from "@/lib/sources/freejobalert";
import { parseWordpressHome } from "@/lib/sources/wordpress";
import { parseRss } from "@/lib/sources/common";
import { dedupeKey } from "@/lib/util";

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");

describe("himexam", () => {
  const items = parseHimexam(fx("himexam-list.html"));
  it("parses job cards", () => {
    expect(items.length).toBeGreaterThan(5);
    expect(items[0].title).toMatch(/DAV Public Schools/);
    expect(items[0].lastDate).toBe("08 October 2026");
    expect(items[0].dateLabel).toBe("Last Date");
    expect(items.every((i) => i.hp && i.url.startsWith("https://himexam.com/"))).toBe(true);
  });
});

describe("freejobalert", () => {
  it("parses the HP table with vacancies and last date", () => {
    const items = parseFjaHpTable(fx("fja-hp.html"));
    expect(items.length).toBeGreaterThan(5);
    const gds = items.find((i) => /Gramin Dak Sevak/.test(i.title))!;
    expect(gds.vacancies).toBe(23757);
    expect(gds.lastDate).toBe("21-09-2026");
    expect(gds.teaser).toMatch(/10TH/);
  });
  it("parses the RSS feed and categorises", () => {
    const items = parseFjaFeed(fx("fja-feed.xml"));
    expect(items.length).toBeGreaterThan(10);
    expect(items.some((i) => i.category === "admit-card")).toBe(true);
  });
});

describe("sarkariresult", () => {
  it("parses homepage links and skips navigation pages", () => {
    const items = parseWordpressHome(fx("sarkari-home.html"), "https://sarkariresult.com.cm/", "sarkariresult");
    expect(items.length).toBeGreaterThan(10);
    expect(items.find((i) => /CHSL/.test(i.title))?.vacancies).toBe(2536);
    expect(items.some((i) => /privacy|contact|disclaimer/i.test(i.url))).toBe(false);
    expect(items.some((i) => i.category === "result")).toBe(true);
  });
  it("parses the feed", () => {
    expect(parseRss(fx("sarkari-feed.xml")).length).toBe(10);
  });
});

describe("dedupe", () => {
  it("matches the same job across sites", () => {
    const a = dedupeKey("SSC CHSL Online Form (2536 Posts)", "job", 2536);
    const b = dedupeKey("SSC 2536 CHSL Online Form 2026", "job", 2536);
    expect(a).toBe(b);
  });
  it("keeps different jobs apart", () => {
    expect(dedupeKey("SSC JE Online Form (1748 Posts)", "job", 1748)).not.toBe(dedupeKey("SSC CHSL Online Form (2536 Posts)", "job", 2536));
  });
});
