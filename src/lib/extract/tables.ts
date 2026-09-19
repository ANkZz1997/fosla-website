import * as cheerio from "cheerio";
import type { JobDetails, KV, PostWise } from "../types";
import { clean } from "../util";

type $ = cheerio.CheerioAPI;

const SOCIAL_OR_PROMO = /(t\.me|telegram|whatsapp|facebook|instagram|twitter|x\.com|youtube|youtu\.be|play\.google|linkedin|pinterest)/i;
const LINK_TEXT = /apply (online|now)|official (website|site|notification|link)|notification|advertisement|registration|login|detailed? (notice|notification)/i;

/** The element that holds the article. Page builders (Elementor etc.) don't use .entry-content, so pick the candidate with the most tables. */
export function rootOf($: $) {
  const candidates = [".entry-content", ".elementor-widget-theme-post-content", ".post-content", "article", "main", "#content", "body"];
  let best: cheerio.Cheerio<any> = $("body").first();
  let bestTables = -1;
  for (const sel of candidates) {
    $(sel).each((_, el) => {
      const n = $(el).find("table").length;
      if (n > bestTables) {
        best = $(el);
        bestTables = n;
      }
    });
    // A specific match that has tables is good enough; don't widen to <body> and pull in sidebars.
    if (bestTables > 0 && sel !== "body") break;
  }
  return best;
}

function rows($: $, table: cheerio.Cheerio<any>): string[][] {
  const out: string[][] = [];
  table.find("tr").each((_, tr) => {
    const cells = $(tr)
      .children("th,td")
      .map((__, c) => clean($(c).text()))
      .get();
    if (cells.some(Boolean)) out.push(cells);
  });
  return out;
}

const num = (s: string | undefined) => {
  const m = s?.match(/^\s*(\d[\d,]*)/);
  return m ? Number(m[1].replace(/,/g, "")) : undefined;
};

const CAT_COLS = /^(ur|gen|general|sc|st|obc|obc\(ncl\)|ews|bc|ebc|pwd|pwbd|esm|ph|dfp|ex-?s)$/i;

const CATEGORY_LIKE = /^(ur|un-?reserved|gen|general|sc|st|obc|obc\(ncl\)|ews|bc|ebc|pwd|pwbd|esm|ph|ex-?servicemen|dfp|wff)\b/i;

interface ParsedTable {
  posts: PostWise[];
  /** Rows of a reservation-category table ("UR 64, SC 30 ...") that describe seats, not posts. */
  categories: { label: string; seats?: number }[];
}

function parsePostWise(t: string[][]): ParsedTable {
  const head = t[0].map((h) => h.toLowerCase());
  const skip = (h: string) => /^(s\.?\s?no\.?|sr\.?\s?no\.?|sl\.?\s?no\.?|#)$/.test(h);
  const postCol = head.findIndex((h) => !skip(h) && !CAT_COLS.test(h) && /post|discipline|trade|name|department|subject|designation|category|branch|cadre|role/.test(h));
  if (postCol < 0) return { posts: [], categories: [] };
  const totalCol = head.findIndex((h, i) => i !== postCol && /total|(no\.?|number) of (posts?|vacanc|seats)|vacanc|^posts?$|seats|post count/.test(h));
  const catCols = head.map((h, i) => (CAT_COLS.test(h) ? i : -1)).filter((i) => i >= 0);

  const body = t.slice(1).filter((r) => r[postCol] && !/\btotal\b/i.test(r[postCol]));
  const categoryTable = head[postCol] === "category" || (body.length > 1 && body.filter((r) => CATEGORY_LIKE.test(r[postCol])).length / body.length >= 0.5);
  if (categoryTable) {
    return { posts: [], categories: body.map((r) => ({ label: r[postCol], seats: totalCol >= 0 ? num(r[totalCol]) : undefined })) };
  }

  const out: PostWise[] = [];
  for (const r of body) {
    const post = r[postCol];
    let seats = totalCol >= 0 ? num(r[totalCol]) : undefined;
    let breakup: string | undefined;
    if (catCols.length) {
      const parts = catCols.map((i) => [t[0][i], num(r[i])] as const).filter(([, n]) => n);
      if (parts.length) breakup = parts.map(([k, n]) => `${k} ${n}`).join(" · ");
      if (seats === undefined) seats = catCols.reduce((sum, i) => sum + (num(r[i]) ?? 0), 0);
    }
    if (totalCol >= 0) {
      // "300 (UR-122, SC-45, ST-22)" -> seats 300, breakup "UR 122 · SC 45 · ST 22"
      const paren = r[totalCol]?.match(/\((.*)\)\s*$/)?.[1];
      if (paren && /\d/.test(paren) && !breakup) breakup = paren.replace(/\s*[-:]\s*(\d)/g, " $1").replace(/\s*,\s*/g, " · ");
    }
    out.push({ post, seats, breakup });
  }
  return { posts: out, categories: [] };
}

const toKV = (t: string[][], from = 0): KV[] =>
  t.slice(from).filter((r) => r[0] && r.length > 1).map((r) => ({ label: r[0], value: r.slice(1).filter(Boolean).join(" · ") })).filter((k) => k.value);

const isHeaderRow = (r: string[]) => r.length === 2 && /^(details|marks|value|amount|remarks|description|dates?|information|particulars|fees?|honorarium|salary)$/i.test(r[1]);

const DATE_LABEL = /date|last|start|open|close|begin|commence|exam|admit|interview|schedule|deadline|result|correction/i;

function overviewField(label: string): keyof JobDetails | "date" | null {
  const l = label.toLowerCase();
  if (/^(recruitment )?(organi[sz]ation|department|board|conducting body|company)( name)?$|recruitment department|name of (the )?(organi[sz]ation|department|board)/.test(l)) return "organization";
  if (/^post names?$|^name of (the )?posts?$|^posts?$|^post name\/s$/.test(l)) return "postName";
  if (/advert(isement)?\.? ?(no|number)|notification (no|number)/.test(l)) return "advertisementNo";
  if (/total (vacanc|post)|no\.? of (vacanc|post)|^vacanc(y|ies)$/.test(l)) return "totalVacancies";
  if (/pay (level|scale|matrix)|salary|remuneration|honorarium|stipend|pay band/.test(l)) return "payScale";
  if (/application mode|mode of (apply|application)|apply mode/.test(l)) return "applicationMode";
  if (/^selection$|selection (basis|process|mode)|mode of selection/.test(l)) return "selection";
  if (DATE_LABEL.test(l) && !/mode|fee|age/.test(l)) return "date";
  return null;
}

export function extractOfficialLinks($: $, pageUrl: string): KV[] {
  const pageHost = new URL(pageUrl).hostname.split(".").slice(-2).join(".");
  const seen = new Set<string>();
  const out: KV[] = [];
  rootOf($)
    .find("a[href]")
    .each((_, a) => {
      const href = $(a).attr("href") ?? "";
      const own = clean($(a).text());
      // "Apply Online | Click Here" tables: the anchor says "Click Here", the row label says what it is.
      const rowLabel = clean($(a).closest("tr").children().first().text());
      const text = /^(click|here|link|download|open|visit|apply)\b/i.test(own) && rowLabel && rowLabel !== own && rowLabel.length <= 60 ? rowLabel : own;
      if (!/^https?:/i.test(href) || !text || text.length > 80 || !LINK_TEXT.test(text)) return;
      if (SOCIAL_OR_PROMO.test(href)) return;
      if (new URL(href).hostname.split(".").slice(-2).join(".") === pageHost) return;
      if (seen.has(href)) return;
      seen.add(href);
      out.push({ label: text, value: href });
    });
  return out.slice(0, 5);
}

export function extractDetails(html: string, pageUrl: string): JobDetails {
  const $ = cheerio.load(html);
  const details: JobDetails = { dates: [], postWise: [], age: [], fees: [], qualification: [], links: [], extractedBy: "tables" };
  const root = rootOf($);
  const categories: ParsedTable["categories"] = [];

  const seenTables = new Set<string>();
  root.find("table").each((_, el) => {
    const t = rows($, $(el));
    if (t.length < 2) return;
    const sig = JSON.stringify(t);
    if (seenTables.has(sig)) return; // page repeats the same table (desktop + mobile copies)
    seenTables.add(sig);
    const head = t[0].join(" ").toLowerCase();
    const cols = Math.max(...t.map((r) => r.length));

    if (/qualification|eligib/.test(head) && cols >= 2 && !/age limit/.test(head)) {
      details.qualification.push(...toKV(t, 1));
      return;
    }
    if (/\bage\b/.test(head) && !/post/.test(t[0][0].toLowerCase())) {
      details.age.push(...toKV(t, 1));
      return;
    }
    if (/\bfee\b|fees/.test(head)) {
      details.fees.push(...toKV(t, 1));
      return;
    }
    if (/post|discipline|trade|designation|department|branch|cadre/.test(head) && /total|no\.? of|vacanc|posts|seats|\bur\b|\bsc\b|\bobc\b|\bgen\b|ews/.test(head) && t.length >= 2 && !/^particulars/.test(head)) {
      const parsed = parsePostWise(t);
      details.postWise.push(...parsed.posts);
      categories.push(...parsed.categories);
      return;
    }
    if (cols === 2 && /honorarium|salary|pay|stipend|remuneration|emolument/.test(head) && /post|designation|name/.test(t[0][0].toLowerCase())) {
      details.payScale ??= toKV(t, 1).map((k) => `${k.label}: ${k.value}`).join(" · ");
      return;
    }
    if (cols === 2 || /^(particulars|event|details|important)/.test(head)) {
      // A first row like "Selection Criteria | Marks" is a header, not a key/value pair.
      const start = /^(particulars|event|details|important|description)/.test(t[0][0].toLowerCase()) || isHeaderRow(t[0]) ? 1 : 0;
      const isEventTable = /^(event|important dates?|schedule)/.test(head) || /^dates?$/.test(t[0][1]?.toLowerCase() ?? "");
      for (const r of t.slice(start)) {
        if (r.length < 2 || !r[0] || !r[1]) continue;
        const field = overviewField(r[0]);
        if (isEventTable) details.dates.push({ label: r[0], value: r[1] });
        else if (field === "date") details.dates.push({ label: r[0], value: r[1] });
        else if (field && !(details as any)[field]) (details as any)[field] = r[1];
      }
    }
  });

  details.links = extractOfficialLinks($, pageUrl);

  const text = clean(root.text());
  if (!details.dates.length) {
    const m = text.match(/last date[^0-9]{0,40}(\d{1,2}[\s./-]+(?:[A-Za-z]+|\d{1,2})[\s./-]+\d{2,4})/i);
    if (m) details.dates.push({ label: "Last Date", value: m[1] });
  }
  if (!details.postWise.length && categories.length && details.postName) {
    const sum = categories.reduce((n, c) => n + (c.seats ?? 0), 0);
    const declared = num(details.totalVacancies);
    const seats = declared ?? (sum || undefined);
    const abbreviate = (l: string) =>
      l.replace(/Ex-?\s?Servicemen/i, "ESM").replace(/Orthopaedically Physically Handicapped|Physically Handicapped/i, "OH").replace(/Wards of Freedom Fighters/i, "WFF")
        .replace(/\s+of HP\b/gi, "").replace(/\s*[–-]\s*/g, "/").trim();
    details.postWise = [{ post: details.postName, seats, breakup: categories.filter((c) => c.seats).map((c) => `${abbreviate(c.label)} ${c.seats}`).join(" · ") || undefined }];
  }
  if (!details.postWise.length && details.postName) {
    const names = details.postName.split(/\s*(?:,|\band\b|&|\/|;)\s*/i).map(clean).filter((n) => n.length > 2 && n.length < 70);
    if (names.length <= 8) details.postWise = names.map((post) => ({ post }));
  }
  // Drop exact duplicates that appear when a page repeats its tables.
  const uniq = <T,>(a: T[]) => [...new Map(a.map((x) => [JSON.stringify(x), x])).values()];
  details.dates = uniq(details.dates);
  details.age = uniq(details.age);
  details.fees = uniq(details.fees);
  details.qualification = uniq(details.qualification);
  return details;
}

/** Plain text of the article body, used as input for the optional AI pass. */
export function articleText(html: string): string {
  const $ = cheerio.load(html);
  const root = rootOf($);
  root.find("script,style,nav,footer,form,iframe,noscript,.sharedaddy,.wp-block-buttons").remove();
  root.find("tr").each((_, tr) => {
    const line = $(tr).children("th,td").map((__, c) => clean($(c).text())).get().join(" | ");
    $(tr).replaceWith(`\n${line}\n`);
  });
  return root.text().replace(/\n\s*\n+/g, "\n").replace(/[ \t]+/g, " ").trim();
}
