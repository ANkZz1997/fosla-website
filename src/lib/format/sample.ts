import type { JobRecord } from "../types";

/** Clearly labelled demo post, used on the landing page until real posts exist. Never stored or posted. */
export const SAMPLE_JOB: JobRecord = {
  id: "sample0000000",
  key: "sample",
  source: "himexam",
  title: "SAMPLE POST - Junior Assistant Recruitment 2026",
  url: "https://example.com",
  category: "job",
  hp: true,
  createdAt: "2026-09-18T09:00:00+05:30",
  lastDate: "31 December 2026",
  vacancies: 120,
  status: "ready",
  details: {
    organization: "Example Department, Himachal Pradesh",
    totalVacancies: "120",
    applicationMode: "Online",
    dates: [{ label: "Last Date", value: "31 December 2026" }],
    postWise: [
      { post: "Junior Assistant", seats: 80, breakup: "UR 40 · SC 16 · ST 8 · OBC 12 · EWS 4" },
      { post: "Clerk", seats: 30 },
      { post: "Peon", seats: 10 },
    ],
    age: [],
    fees: [],
    qualification: [],
    links: [],
    extractedBy: "tables",
  },
};
