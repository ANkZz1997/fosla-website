import type { ListingItem, SourceId, SourceResult } from "../types";
import { fetchHimexam } from "./himexam";
import { fetchFreeJobAlert } from "./freejobalert";
import { fetchWordpress } from "./wordpress";

export const SOURCES: { id: SourceId; label: string; fetch: () => Promise<ListingItem[]> }[] = [
  { id: "himexam", label: "HimExam", fetch: fetchHimexam },
  { id: "freejobalert", label: "FreeJobAlert", fetch: fetchFreeJobAlert },
  { id: "sarkariresult", label: "SarkariResult", fetch: () => fetchWordpress("sarkariresult", "https://sarkariresult.com.cm") },
  { id: "rojgarresult", label: "RojgarResult", fetch: () => fetchWordpress("rojgarresult", "https://rojgarresult.com") },
];

/** Every source runs independently: one site being down or blocking us never stops the others. */
export async function fetchAllSources(): Promise<{ items: ListingItem[]; results: SourceResult[] }> {
  const settled = await Promise.allSettled(SOURCES.map((s) => s.fetch()));
  const items: ListingItem[] = [];
  const results: SourceResult[] = settled.map((r, i) => {
    const source = SOURCES[i].id;
    if (r.status === "fulfilled") {
      items.push(...r.value);
      return { source, ok: true, count: r.value.length };
    }
    return { source, ok: false, count: 0, error: r.reason instanceof Error ? r.reason.message : String(r.reason) };
  });
  return { items, results };
}
