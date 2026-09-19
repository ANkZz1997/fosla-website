import { afterEach, describe, expect, it } from "vitest";
import { toLandingJob } from "@/lib/landing-data";
import { SAMPLE_JOB } from "@/lib/format/sample";
import type { JobRecord } from "@/lib/types";

const NOW = Date.parse("2026-09-19T12:00:00+05:30");
const job = (over: Partial<JobRecord> & { lastDate?: string } = {}): JobRecord => {
  const { lastDate, ...rest } = over;
  return {
    ...SAMPLE_JOB,
    createdAt: "2026-09-18T09:00:00+05:30",
    lastDate,
    details: { ...SAMPLE_JOB.details, dates: lastDate ? [{ label: "Last Date", value: lastDate }] : [] },
    ...rest,
  };
};

afterEach(() => delete process.env.LANDING_JOBS);

describe("public job board: which jobs are active", () => {
  it("shows an open job that has not been posted yet (default: all)", () => {
    const j = toLandingJob(job({ lastDate: "31 December 2026", status: "ready" }), NOW);
    expect(j).not.toBeNull();
    expect(j!.posted).toBe(false);
  });
  it("hides jobs you skipped", () => {
    expect(toLandingJob(job({ lastDate: "31 December 2026", status: "skipped" }), NOW)).toBeNull();
  });
  it("hides jobs past their deadline, but keeps the last day itself", () => {
    expect(toLandingJob(job({ lastDate: "18-09-2026" }), NOW)).toBeNull();
    expect(toLandingJob(job({ lastDate: "19-09-2026" }), NOW)).not.toBeNull();
  });
  it("hides a job with an unreadable deadline once it is 45 days old", () => {
    expect(toLandingJob(job({ lastDate: "soon", createdAt: "2026-07-01T00:00:00+05:30" }), NOW)).toBeNull();
    expect(toLandingJob(job({ lastDate: "soon", createdAt: "2026-09-10T00:00:00+05:30" }), NOW)).not.toBeNull();
  });
  it("fades results and admit cards after 10 days", () => {
    expect(toLandingJob(job({ category: "result", createdAt: "2026-09-05T00:00:00+05:30" }), NOW)).toBeNull();
    expect(toLandingJob(job({ category: "result", createdAt: "2026-09-15T00:00:00+05:30" }), NOW)).not.toBeNull();
  });
  it("LANDING_JOBS=posted shows only posted jobs", () => {
    process.env.LANDING_JOBS = "posted";
    expect(toLandingJob(job({ lastDate: "31 December 2026", status: "ready" }), NOW)).toBeNull();
    expect(toLandingJob(job({ lastDate: "31 December 2026", status: "posted" }), NOW)?.posted).toBe(true);
  });
  it("sends the browser only public-safe fields", () => {
    const j = toLandingJob(job({ lastDate: "31 December 2026" }), NOW)!;
    expect(Object.keys(j).sort()).toEqual(["category", "createdAt", "deadline", "hp", "id", "lastDate", "lastLabel", "mode", "org", "posted", "postCount", "posts", "title", "total"].sort());
  });
});
