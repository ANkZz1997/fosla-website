import { env } from "./config";
import { enrich } from "./extract/enrich";
import { canPublish, publishJob } from "./publish";
import { fetchAllSources } from "./sources";
import { getStore, type Store } from "./store";
import type { Category, JobRecord, ListingItem, RunSummary, SourceId } from "./types";
import { parseLooseDate, pool } from "./util";

const SOURCE_RANK: Record<SourceId, number> = { himexam: 0, freejobalert: 1, sarkariresult: 2, rojgarresult: 3 };
const CATEGORY_RANK: Record<Category, number> = { job: 0, admission: 1, "admit-card": 2, result: 3, "answer-key": 4, syllabus: 5, other: 6 };

const DAY = 86_400_000;
const MAX_CANDIDATES = 80;

/** Jobs past their deadline and stale results/admit cards are not worth posting. */
function isStale(item: ListingItem, now: number) {
  if (item.category === "job") {
    const end = parseLooseDate(item.lastDate);
    return !!end && end.getTime() < now;
  }
  const age = item.publishedAt ? now - Date.parse(item.publishedAt) : 0;
  return age > 10 * DAY;
}

export function pickCandidates(items: ListingItem[], now = Date.now()): ListingItem[] {
  const usable = items.filter((i) => i.category !== "other" && !isStale(i, now) && (!env.onlyHp || i.hp));
  // Same job on several sites: keep the copy from the most useful source.
  const byKey = new Map<string, ListingItem>();
  for (const i of usable.sort((a, b) => SOURCE_RANK[a.source] - SOURCE_RANK[b.source])) if (!byKey.has(i.key)) byKey.set(i.key, i);
  return [...byKey.values()]
    .sort(
      (a, b) =>
        Number(b.hp) - Number(a.hp) ||
        CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category] ||
        (Date.parse(b.publishedAt ?? "") || 0) - (Date.parse(a.publishedAt ?? "") || 0),
    )
    .slice(0, MAX_CANDIDATES);
}

/** A job scraped from the listing alone (page failed to load) is too thin to publish unattended. */
export const autoPostable = (j: JobRecord) => j.category !== "job" || j.details.extractedBy !== "listing-only";

async function postReady(store: Store, deadline: number, summary: RunSummary) {
  const ready = (await store.listJobs(60)).filter((j) => j.status === "ready" && autoPostable(j)).reverse();
  for (const job of ready) {
    if (Date.now() > deadline) break;
    const res = await publishJob(job);
    await store.saveJob(res.ok ? { ...job, status: "posted", postedAt: new Date().toISOString(), error: undefined } : { ...job, status: "failed", error: res.error });
    if (res.ok) summary.posted++;
    else summary.errors.push(`post ${job.id}: ${res.error}`);
    await new Promise((r) => setTimeout(r, 2500)); // don't burst-post to the channel
  }
}

const CONCURRENCY = 3;
/** Claims taken before a job is saved expire on their own, so a run killed mid-way never loses a job. */
const CLAIM_TTL = 15 * 60;
const MAX_REFRESH = 5;

/** A page that failed to load once (site hiccup at midnight) gets another chance on later runs. */
async function refreshThin(store: Store, startBy: number, summary: RunSummary) {
  const thin = (await store.listJobs(60)).filter(
    (j) => j.category === "job" && j.details.extractedBy === "listing-only" && j.status !== "posted" && (j.enrichTries ?? 0) < 3,
  );
  let done = 0;
  for (const job of thin) {
    if (done >= MAX_REFRESH || Date.now() > startBy) break;
    done++;
    const details = await enrich(job);
    await store.saveJob({ ...job, details, enrichTries: (job.enrichTries ?? 0) + 1 });
    if (details.extractedBy !== "listing-only") summary.refreshed++;
  }
}

export async function runPipeline(opts: { maxNew?: number; budgetMs?: number } = {}): Promise<RunSummary> {
  const started = Date.now();
  const store = getStore();
  const maxNew = opts.maxNew ?? env.maxNewPerRun;
  const budget = opts.budgetMs ?? 50_000;
  const deadline = started + budget;
  // Stop starting new jobs well before the function limit so in-flight pages can finish.
  const startBy = started + Math.floor(budget * 0.75);
  const summary: RunSummary = { startedAt: new Date(started).toISOString(), finishedAt: "", sources: [], discovered: 0, fresh: 0, created: 0, refreshed: 0, posted: 0, errors: [] };

  const { items, results } = await fetchAllSources();
  summary.sources = results;
  summary.discovered = items.length;
  for (const r of results) if (!r.ok) summary.errors.push(`${r.source}: ${r.error}`);

  // Workers pull candidates one at a time. A slot is reserved before any await so the per-run cap is exact,
  // and a job is claimed only when a worker is about to process it (never in bulk up front).
  const queue = pickCandidates(items);
  let reserved = 0;
  const worker = async () => {
    while (Date.now() <= startBy && reserved < maxNew) {
      const item = queue.shift();
      if (!item) return;
      reserved++;
      if ((await store.getJob(item.id)) || !(await store.claimKey(item.key, item.id, CLAIM_TTL))) {
        reserved--;
        continue;
      }
      summary.fresh++;
      const details = await enrich(item);
      await store.saveJob({ ...item, details, status: "ready", createdAt: new Date().toISOString(), enrichTries: details.extractedBy === "listing-only" ? 1 : 0 });
      await store.renewKey(item.key);
      summary.created++;
    }
  };
  await pool(Array.from({ length: CONCURRENCY }, (_, i) => i), CONCURRENCY, worker);

  await refreshThin(store, startBy, summary);

  if (env.autoPost && canPublish()) {
    if (store.persistent) await postReady(store, deadline, summary);
    else summary.errors.push("AUTO_POST skipped: no persistent storage. Connect Upstash Redis so already-posted jobs are remembered.");
  }

  summary.finishedAt = new Date().toISOString();
  await store.setMeta("lastRun", summary);
  return summary;
}
