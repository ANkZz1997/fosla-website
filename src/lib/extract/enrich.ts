import type { JobDetails, ListingItem } from "../types";
import { fetchText } from "../http";
import { aiEnabled, aiExtract } from "./ai";
import { articleText, extractDetails } from "./tables";

const empty = (): JobDetails => ({ dates: [], postWise: [], age: [], fees: [], qualification: [], links: [], extractedBy: "listing-only" });

/** Fetch the item's own page and turn it into structured details. Never throws: a failed page still yields a listing-only post. */
export async function enrich(item: ListingItem): Promise<JobDetails> {
  let html: string;
  try {
    html = await fetchText(item.url, { timeoutMs: 20_000 });
  } catch (err) {
    console.error(`[enrich] ${item.url}:`, err instanceof Error ? err.message : err);
    return empty();
  }
  const details = extractDetails(html, item.url);

  // Only ask the model when the tables did not give us the core facts.
  const needsAi = item.category === "job" && (!details.postWise.length || !details.dates.length);
  if (needsAi && aiEnabled()) {
    const ai = await aiExtract(item.title, articleText(html));
    if (ai) {
      return {
        ...details,
        organization: details.organization ?? ai.organization,
        totalVacancies: details.totalVacancies ?? ai.totalVacancies,
        payScale: details.payScale ?? ai.payScale,
        applicationMode: details.applicationMode ?? ai.applicationMode,
        postWise: details.postWise.length ? details.postWise : (ai.postWise ?? []),
        dates: details.dates.length ? details.dates : (ai.dates ?? []),
        age: details.age.length ? details.age : (ai.age ?? []),
        fees: details.fees.length ? details.fees : (ai.fees ?? []),
        qualification: details.qualification.length ? details.qualification : (ai.qualification ?? []),
        summary: ai.summary,
        extractedBy: "ai",
      };
    }
  }
  return details;
}
