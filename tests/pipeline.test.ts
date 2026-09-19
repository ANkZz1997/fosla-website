import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JobDetails, ListingItem } from "@/lib/types";

const item = (n: number): ListingItem => ({
  id: `id${String(n).padStart(10, "0")}`,
  key: `job|k${n}|`,
  source: "himexam",
  title: `Test Recruitment ${n}`,
  url: `https://example.com/job-${n}`,
  category: "job",
  hp: true,
  lastDate: "31 December 2026",
  publishedAt: `2026-09-${String(10 + (n % 9)).padStart(2, "0")}T00:00:00Z`,
});

const full: JobDetails = { dates: [], postWise: [{ post: "Clerk", seats: 2 }], age: [], fees: [], qualification: [], links: [], extractedBy: "tables" };
const thin: JobDetails = { ...full, postWise: [], extractedBy: "listing-only" };

const state = { items: [] as ListingItem[], enrich: vi.fn<(i: ListingItem) => Promise<JobDetails>>() };

vi.mock("@/lib/sources", () => ({
  fetchAllSources: async () => ({ items: state.items, results: [{ source: "himexam", ok: true, count: state.items.length }] }),
}));
vi.mock("@/lib/extract/enrich", () => ({ enrich: (i: ListingItem) => state.enrich(i) }));

async function fresh() {
  // MemoryStore is purely in-memory when it thinks it is on Vercel.
  process.env.VERCEL = "1";
  delete (globalThis as { __foslaStore?: unknown }).__foslaStore;
  const { getStore } = await import("@/lib/store");
  const { runPipeline } = await import("@/lib/pipeline");
  return { store: getStore(), runPipeline };
}

beforeEach(() => {
  state.items = Array.from({ length: 10 }, (_, i) => item(i + 1));
  state.enrich = vi.fn(async () => full);
  vi.setSystemTime(new Date("2026-09-20T00:00:00+05:30"));
});

describe("nightly pipeline", () => {
  it("takes in exactly maxNew jobs and claims nothing beyond that", async () => {
    const { store, runPipeline } = await fresh();
    const claim = vi.spyOn(store, "claimKey");
    const s = await runPipeline({ maxNew: 3 });
    expect(s.created).toBe(3);
    expect((await store.listJobs(50)).length).toBe(3);
    expect(claim).toHaveBeenCalledTimes(3);
  });

  it("claims with a short TTL first, then makes the claim permanent once the job is saved", async () => {
    const { store, runPipeline } = await fresh();
    const claim = vi.spyOn(store, "claimKey");
    const renew = vi.spyOn(store, "renewKey");
    await runPipeline({ maxNew: 2 });
    expect(claim.mock.calls.every((c) => c[2] === 15 * 60)).toBe(true);
    expect(renew).toHaveBeenCalledTimes(2);
  });

  it("when the time budget is already spent it starts nothing and claims nothing, so those jobs are picked up next run", async () => {
    const { store, runPipeline } = await fresh();
    const s = await runPipeline({ maxNew: 5, budgetMs: -1000 });
    expect(s.created).toBe(0);
    expect(await store.claimKey(state.items[0].key, state.items[0].id)).toBe(true); // still free
    const next = await runPipeline({ maxNew: 5 });
    expect(next.created).toBe(5); // the cap, taken from the 9 jobs whose keys are still free
    expect(await store.getJob(state.items[0].id)).toBeNull(); // the one key claimed above is (correctly) skipped
  });

  it("does not create anything twice on a second run, and keeps draining the backlog", async () => {
    const { store, runPipeline } = await fresh();
    await runPipeline({ maxNew: 4 });
    const second = await runPipeline({ maxNew: 4 });
    expect(second.created).toBe(4);
    const ids = (await store.listJobs(50)).map((j) => j.id);
    expect(new Set(ids).size).toBe(8);
    const third = await runPipeline({ maxNew: 40 });
    expect(third.created).toBe(2);
    expect((await runPipeline({ maxNew: 40 })).created).toBe(0);
  });

  it("gives a job whose page failed another chance on a later run", async () => {
    const { store, runPipeline } = await fresh();
    state.items = [item(1)];
    state.enrich = vi.fn(async () => thin);
    const first = await runPipeline({ maxNew: 5 });
    expect(first.created).toBe(1);
    expect((await store.getJob(item(1).id))!.details.extractedBy).toBe("listing-only");

    state.enrich = vi.fn(async () => full);
    const second = await runPipeline({ maxNew: 5 });
    expect(second.refreshed).toBe(1);
    const j = (await store.getJob(item(1).id))!;
    expect(j.details.extractedBy).toBe("tables");
    expect(j.status).toBe("ready");
  });

  it("stops retrying a page after 3 attempts", async () => {
    const { store, runPipeline } = await fresh();
    state.items = [item(1)];
    state.enrich = vi.fn(async () => thin);
    for (let i = 0; i < 6; i++) await runPipeline({ maxNew: 5 });
    expect((await store.getJob(item(1).id))!.enrichTries).toBe(3);
  });
});

describe("schedule", () => {
  it("vercel.json fires at 18:30 UTC, which is 12:00 AM in India", async () => {
    const cfg = JSON.parse((await import("node:fs")).readFileSync("vercel.json", "utf8"));
    expect(cfg.crons).toEqual([{ path: "/api/cron/run", schedule: "30 18 * * *" }]);
    // 18:30 UTC + 5:30 = 00:00 IST
    expect(new Date(Date.UTC(2026, 8, 19, 18, 30)).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false })).toBe("00:00:00");
  });
});
