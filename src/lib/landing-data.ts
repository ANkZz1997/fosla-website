import { env } from "./config";
import { deriveFacts } from "./format/model";
import { getStore } from "./store";
import type { Category, JobRecord } from "./types";
import { parseLooseDate } from "./util";

/** Only public-safe fields: this object is sent to every visitor's browser. */
export interface LandingJob {
  id: string;
  title: string;
  category: Category;
  hp: boolean;
  org?: string;
  total?: string;
  lastDate?: string;
  lastLabel: string;
  /** End of the last day (IST) as an ISO string, when the source's date could be read. */
  deadline?: string;
  mode?: string;
  posts: { post: string; seats?: number }[];
  postCount: number;
  createdAt: string;
  /** Has been marked or sent as posted, so its poster is public. */
  posted: boolean;
}

export interface LandingData {
  jobs: LandingJob[];
  postedCount: number;
  updatedAt: string;
}

const DAY = 86_400_000;
const MAX_JOBS = 120;

/**
 * "Active" means still worth showing: not skipped, and either its deadline has not passed
 * or (when the deadline can't be read) it is recent. Results and admit cards fade after 10 days.
 */
export function toLandingJob(j: JobRecord, now: number): LandingJob | null {
  if (j.status === "skipped") return null;
  if (env.landingJobs === "posted" && j.status !== "posted") return null;
  if (j.category === "other" || j.category === "syllabus") return null;

  const f = deriveFacts(j);
  const end = parseLooseDate(f.lastDate);
  const age = now - Date.parse(j.createdAt);
  if (j.category === "job") {
    if (end ? end.getTime() < now : age > 45 * DAY) return null;
  } else if (age > 10 * DAY) return null;

  const posts = [...j.details.postWise].sort((a, b) => (b.seats ?? -1) - (a.seats ?? -1));
  return {
    id: j.id,
    title: f.title,
    category: j.category,
    hp: j.hp,
    org: f.org,
    total: f.total,
    lastDate: f.lastDate,
    lastLabel: f.lastLabel,
    deadline: end?.toISOString(),
    mode: f.modeShort,
    posts: posts.slice(0, 6).map((p) => ({ post: p.post, seats: p.seats })),
    postCount: posts.length,
    createdAt: j.createdAt,
    posted: j.status === "posted",
  };
}

// The landing page is public. Cache the store read so visitors never translate into database reads.
let cache: { at: number; data: LandingData } | undefined;
const TTL = 120_000;

export async function getLandingData(): Promise<LandingData> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const now = Date.now();
  let data: LandingData = { jobs: [], postedCount: 0, updatedAt: new Date(now).toISOString() };
  try {
    const jobs = (await getStore().listJobs(MAX_JOBS)).map((j) => toLandingJob(j, now)).filter((j): j is LandingJob => !!j);
    data = { jobs, postedCount: jobs.filter((j) => j.posted).length, updatedAt: new Date(now).toISOString() };
  } catch (err) {
    console.error("[landing] store read failed:", err instanceof Error ? err.message : err);
  }
  cache = { at: now, data };
  return data;
}
