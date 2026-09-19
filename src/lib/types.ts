export type SourceId = "himexam" | "freejobalert" | "sarkariresult" | "rojgarresult";

export type Category =
  | "job"
  | "admit-card"
  | "result"
  | "answer-key"
  | "admission"
  | "syllabus"
  | "other";

export type Status = "ready" | "posted" | "skipped" | "failed";

/** One row scraped from a source's listing page or feed. */
export interface ListingItem {
  id: string;
  /** Fuzzy key so the same job seen on two sites is only posted once. */
  key: string;
  source: SourceId;
  title: string;
  url: string;
  category: Category;
  publishedAt?: string;
  /** Deadline as printed by the source, e.g. "08 October 2026". */
  lastDate?: string;
  dateLabel?: string;
  vacancies?: number;
  /** True when the item is clearly about Himachal Pradesh. */
  hp: boolean;
  teaser?: string;
}

export interface KV {
  label: string;
  value: string;
}

export interface PostWise {
  post: string;
  seats?: number;
  /** Category-wise split, e.g. "UR 122 · SC 45 · ST 22". */
  breakup?: string;
}

export interface JobDetails {
  organization?: string;
  postName?: string;
  advertisementNo?: string;
  totalVacancies?: string;
  payScale?: string;
  applicationMode?: string;
  selection?: string;
  dates: KV[];
  postWise: PostWise[];
  age: KV[];
  fees: KV[];
  qualification: KV[];
  /** Official links only (apply, notification PDF, official site). */
  links: KV[];
  /** One or two plain-language lines about who this is for. */
  summary?: string;
  extractedBy: "tables" | "ai" | "listing-only";
}

export interface JobRecord extends ListingItem {
  details: JobDetails;
  status: Status;
  createdAt: string;
  postedAt?: string;
  error?: string;
}

export interface SourceResult {
  source: SourceId;
  ok: boolean;
  count: number;
  error?: string;
}

export interface RunSummary {
  startedAt: string;
  finishedAt: string;
  sources: SourceResult[];
  discovered: number;
  fresh: number;
  created: number;
  posted: number;
  errors: string[];
}
