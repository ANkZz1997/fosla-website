import type { Category, JobRecord, KV } from "../types";

export const CATEGORY_LABEL: Record<Category, string> = {
  job: "NEW RECRUITMENT",
  "admit-card": "ADMIT CARD / EXAM UPDATE",
  result: "RESULT DECLARED",
  "answer-key": "ANSWER KEY",
  admission: "ADMISSION / SCHOLARSHIP",
  syllabus: "SYLLABUS",
  other: "IMPORTANT UPDATE",
};

const findDate = (dates: KV[], re: RegExp) => dates.find((d) => re.test(d.label))?.value;

const tidy = (s: string | undefined) => s?.replace(/\s+/g, " ").trim() || undefined;

/** "Application form to be filled by hand, scanned and e-mailed" -> "By e-mail". Tiles on the poster only fit a few words. */
export function shortMode(mode: string | undefined): string | undefined {
  if (!mode) return undefined;
  if (mode.length <= 18) return mode;
  if (/walk[- ]?in/i.test(mode)) return "Walk-in";
  if (/e-?mail/i.test(mode)) return "By e-mail";
  if (/online/i.test(mode)) return "Online";
  if (/offline|post|hand|speed|courier/i.test(mode)) return "Offline";
  return mode.slice(0, 16).trim() + "…";
}

/** Facts every output (caption, poster, dashboard) agrees on. */
export function deriveFacts(job: JobRecord) {
  const d = job.details;
  const seatsSum = d.postWise.reduce((s, p) => s + (p.seats ?? 0), 0);
  // Source cells often read "1,871 (post-wise breakup below)"; the tile and headline want just the number.
  const totalText = tidy(d.totalVacancies);
  const total =
    totalText?.match(/^\d[\d,]*/)?.[0] ?? totalText ?? (job.vacancies ? job.vacancies.toLocaleString("en-IN") : seatsSum ? seatsSum.toLocaleString("en-IN") : undefined);
  const lastDate = tidy(findDate(d.dates, /last|clos|end|deadline/i)) ?? tidy(job.lastDate);
  const startDate = tidy(findDate(d.dates, /start|open|begin|commence/i));
  const title = job.title.replace(/\s*\|\s*.*$/, "").trim();
  return {
    title,
    org: tidy(d.organization),
    total,
    lastDate,
    lastLabel: job.dateLabel ?? "Last Date",
    startDate,
    mode: tidy(d.applicationMode),
    modeShort: shortMode(tidy(d.applicationMode)),
    pay: tidy(d.payScale),
    official: d.links.find((l) => /apply|registration|login/i.test(l.label)),
    notification: d.links.find((l) => /notification|advert/i.test(l.label)),
  };
}


/** "POST-WISE VACANCY" only when at least one post has a seat count; otherwise we only know which posts exist. */
export const hasSeatCounts = (job: JobRecord) => job.details.postWise.some((p) => p.seats !== undefined);
