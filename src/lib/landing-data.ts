import { deriveFacts } from "./format/model";
import { getStore } from "./store";
import type { Category } from "./types";

export interface LandingJob {
  id: string;
  title: string;
  category: Category;
  hp: boolean;
  total?: string;
  lastDate?: string;
  lastLabel: string;
}

export interface LandingData {
  jobs: LandingJob[];
  postedCount: number;
}

// The landing page is public. Cache the store read so visitors never translate into database reads.
let cache: { at: number; data: LandingData } | undefined;
const TTL = 120_000;

/** Only posts you have actually published are shown: drafts waiting for review never appear publicly. */
export async function getLandingData(): Promise<LandingData> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  let data: LandingData = { jobs: [], postedCount: 0 };
  try {
    const posted = (await getStore().listJobs(80)).filter((j) => j.status === "posted");
    data = {
      postedCount: posted.length,
      jobs: posted.slice(0, 9).map((j) => {
        const f = deriveFacts(j);
        return { id: j.id, title: f.title, category: j.category, hp: j.hp, total: f.total, lastDate: f.lastDate, lastLabel: f.lastLabel };
      }),
    };
  } catch (err) {
    console.error("[landing] store read failed:", err instanceof Error ? err.message : err);
  }
  cache = { at: Date.now(), data };
  return data;
}
