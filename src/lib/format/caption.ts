import { BRAND } from "../config";
import type { JobRecord, KV } from "../types";
import { CATEGORY_LABEL, deriveFacts, hasSeatCounts } from "./model";

export interface PostText {
  /** Goes under the poster image. Kept short: WhatsApp truncates long image captions. */
  short: string;
  /** Sent right after the poster as a normal message, with every detail. */
  full: string;
}

const MAX_POSTS = 20;
const MAX_ROWS = 8;

const bullet = (rows: KV[], n = MAX_ROWS) => rows.slice(0, n).map((r) => `• ${r.label}: ${r.value}`);
const section = (title: string, lines: string[]) => (lines.length ? ["", `*${title}*`, ...lines] : []);

const cta = (job: JobRecord) => {
  const docs =
    job.category === "job" || job.category === "admission"
      ? `📎 Bring: Aadhaar, photo & signature, marksheets/certificates${job.hp ? ", HP Bonafide certificate" : ""}, category certificate (if any), mobile number & email.`
      : job.category === "admit-card" || job.category === "result"
        ? "🖨️ We can download and print it for you - just bring your roll number / registration number."
        : "";
  return [
    "━━━━━━━━━━━━━━",
    `🖥️ *${BRAND.name}, ${BRAND.place}*`,
    job.category === "job" || job.category === "admission" ? "Want us to fill this form for you? Message or call us:" : "Need help? Message or call us:",
    `📞 ${BRAND.phones.join(" / ")}`,
    `💬 wa.me/91${BRAND.whatsapp}`,
    docs,
    `📍 ${BRAND.address}`,
    `🕘 ${BRAND.hours}`,
  ].filter(Boolean);
};

export function buildPost(job: JobRecord): PostText {
  const f = deriveFacts(job);
  const d = job.details;
  const headline = `🔔 *${CATEGORY_LABEL[job.category]}*${job.hp ? " | Himachal Pradesh" : ""}`;

  const facts: string[] = [];
  if (f.org) facts.push(`🏢 *Organization:* ${f.org}`);
  if (f.total) facts.push(`📌 *Total Posts:* ${f.total}`);
  if (f.startDate) facts.push(`🟢 *Start Date:* ${f.startDate}`);
  if (f.lastDate) facts.push(`⏳ *${f.lastLabel}:* ${f.lastDate}`);
  if (f.mode) facts.push(`📝 *Apply Mode:* ${f.mode}`);
  if (f.pay) facts.push(`💰 *Pay:* ${f.pay}`);
  if (d.advertisementNo) facts.push(`🔢 *Advt. No:* ${d.advertisementNo}`);

  const postLines = d.postWise.slice(0, MAX_POSTS).flatMap((p, i) => {
    const line = `${i + 1}. ${p.post}${p.seats !== undefined ? ` — *${p.seats}* seat${p.seats === 1 ? "" : "s"}` : ""}`;
    return p.breakup ? [line, `    _${p.breakup}_`] : [line];
  });
  if (d.postWise.length > MAX_POSTS) postLines.push(`...and ${d.postWise.length - MAX_POSTS} more posts (see notification)`);

  const links: string[] = [];
  if (f.official) links.push(`✅ ${f.official.label}: ${f.official.value}`);
  for (const l of d.links) if (l !== f.official) links.push(`📄 ${l.label}: ${l.value}`);
  links.push(`ℹ️ Full details: ${job.url}`);

  const full = [
    headline,
    "",
    `*${f.title}*`,
    ...(d.summary ? ["", `_${d.summary}_`] : []),
    "",
    ...facts,
    ...section(hasSeatCounts(job) ? "📊 POST-WISE VACANCY (SEATS)" : "📊 POSTS INCLUDED", postLines),
    ...section("🎓 QUALIFICATION", bullet(d.qualification)),
    ...section("👤 AGE LIMIT", bullet(d.age)),
    ...section("💳 APPLICATION FEE", bullet(d.fees)),
    ...section("🗓️ IMPORTANT DATES", bullet(d.dates.filter((x) => x.value !== f.lastDate && x.value !== f.startDate))),
    ...section("🔗 LINKS", links),
    "",
    ...cta(job),
  ].join("\n");

  const short = [
    headline,
    `*${f.title}*`,
    "",
    ...[f.total && `📌 Posts: *${f.total}*`, f.lastDate && `⏳ ${f.lastLabel}: *${f.lastDate}*`, f.mode && `📝 ${f.mode}`].filter(Boolean),
    "",
    `Full details below 👇`,
    `📞 ${BRAND.whatsapp} | ${BRAND.name}, Mandi`,
  ].join("\n");

  return { short, full: full.replace(/\n{3,}/g, "\n\n") };
}
