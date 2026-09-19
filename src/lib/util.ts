import { createHash } from "node:crypto";
import type { Category } from "./types";

export const clean = (s: string | undefined | null) =>
  (s ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();

export const shortHash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 12);

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.hostname = u.hostname.replace(/^www\./, "");
    return u.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function categorize(title: string): Category {
  const t = title.toLowerCase();
  if (/\banswer key\b|\bresponse sheet\b|\bobjection\b/.test(t)) return "answer-key";
  if (/\bresult\b|\bmerit list\b|\bcut ?off\b|\bscore ?card\b|\bselected candidate|\bfinal list\b/.test(t)) return "result";
  if (/admit card|hall ticket|call letter|exam city|city intimation|exam date|time ?table|date sheet/.test(t)) return "admit-card";
  if (/\bsyllabus\b|exam pattern/.test(t)) return "syllabus";
  if (/admission|counsell?ing|scholarship|\bcuet\b|\bneet\b.*(reg|apply)|\bjee\b.*(reg|apply)/.test(t)) return "admission";
  if (/recruitment|online form|apply|notification|vacanc|\bposts?\b|walk[- ]?in|\bform\b|bharti|\bjobs?\b|apprentice/.test(t)) return "job";
  return "other";
}

const HP_RE =
  /himachal|\bhp\b|hppsc|hprca|hpssc|hpsebl|hpu\b|hpbose|hpca|shimla|mandi|kangra|kullu|solan|hamirpur|una\b|chamba|bilaspur|sirmaur|kinnaur|lahaul|spiti|dharamshala|palampur|nahan/i;

export const isHimachal = (...texts: (string | undefined)[]) => texts.some((t) => !!t && HP_RE.test(t));

export function vacanciesFromTitle(title: string): number | undefined {
  const m = title.match(/\(?\b(\d{1,3}(?:,\d{3})+|\d{1,6})\s*(?:posts?|vacanc|seats)/i) ?? title.match(/\b(\d{1,3}(?:,\d{3})+|\d{2,6})\b(?=\s+[A-Za-z])/);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  // Years like 2026 are not vacancy counts.
  if (n >= 1990 && n <= 2100 && !/posts?|vacanc|seats/i.test(m[0])) return undefined;
  return n > 0 ? n : undefined;
}

const STOP = new Set([
  "online", "form", "forms", "apply", "recruitment", "notification", "posts", "post", "vacancy", "vacancies", "result", "admit",
  "card", "out", "for", "the", "and", "of", "in", "at", "new", "latest", "exam", "date", "download", "various", "more", "stage",
  "official", "released", "check", "last", "cbt", "walkin", "walk", "updated",
]);

/** Same job on two sites gets the same key, e.g. "SSC CHSL Online Form (2536 Posts)" and "SSC 2536 CHSL Online Form 2026". */
export function dedupeKey(title: string, category: Category, vacancies?: number): string {
  const words = title
    .toLowerCase()
    .replace(/&#?\w+;/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !/^\d+$/.test(w) && !STOP.has(w));
  const uniq = [...new Set(words)].slice(0, 3).sort();
  return [category, ...uniq, vacancies ?? ""].join("|");
}

export function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  return Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker)).then(() => out);
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parses "21-09-2026", "30.09.2026 (05:30 PM)", "08 October 2026", "8th Oct, 2026". Returns end-of-day IST, or undefined. */
export function parseLooseDate(input: string | undefined): Date | undefined {
  if (!input) return undefined;
  const s = input.toLowerCase();
  let d: number, m: number, y: number;
  let match = s.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (match) {
    [d, m, y] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  } else if ((match = s.match(/(\d{1,2})(?:st|nd|rd|th)?[\s,.-]+([a-z]{3,9})[\s,.-]+(\d{4})/))) {
    m = MONTHS.indexOf(match[2].slice(0, 3));
    [d, y] = [Number(match[1]), Number(match[3])];
  } else return undefined;
  if (m < 0 || m > 11 || d < 1 || d > 31) return undefined;
  return new Date(Date.UTC(y, m, d, 23, 59, 59) - 5.5 * 3600_000);
}
