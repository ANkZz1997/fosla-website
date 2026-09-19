// Opt-in: hits the real sites and flags pages whose layout the extractor no longer understands.
// Run with: npm run audit:live
import { writeSync } from "node:fs";
import { it } from "vitest";
import { fetchAllSources } from "@/lib/sources";
import { pickCandidates } from "@/lib/pipeline";
import { fetchText } from "@/lib/http";
import { extractDetails } from "@/lib/extract/tables";
import { pool } from "@/lib/util";

it("live audit", async () => {
  const { items } = await fetchAllSources();
  const jobs = pickCandidates(items).filter((i) => i.category === "job").slice(0, 32);
  const rows = await pool(jobs, 4, async (i) => {
    try {
      const d = extractDetails(await fetchText(i.url), i.url);
      const sum = d.postWise.reduce((s, p) => s + (p.seats ?? 0), 0);
      const flags: string[] = [];
      if (!d.postWise.length) flags.push("NO-POSTS");
      if (d.postWise.some((p) => /^(ur|sc|st|obc|ews|gen|general)\b/i.test(p.post))) flags.push("CATEGORY-AS-POST");
      if (d.postWise.length > 1 && d.postWise.every((p) => p.seats === undefined)) flags.push("NO-SEATS");
      if (i.vacancies && sum && sum !== i.vacancies) flags.push(`SUM≠${i.vacancies}(${sum})`);
      if (!d.dates.length) flags.push("NO-DATES");
      if (d.postName && /^(honorarium|marks|details)$/i.test(d.postName)) flags.push("BAD-POSTNAME");
      return `${i.source.padEnd(13)} posts=${String(d.postWise.length).padStart(2)} sum=${String(sum).padStart(5)} dates=${d.dates.length} age=${d.age.length} fee=${d.fees.length} qual=${d.qualification.length} lnk=${d.links.length} ${flags.join(",").padEnd(22)} ${i.title.slice(0, 55)}`;
    } catch (e) {
      return `${i.source} FETCH-FAIL ${i.url}`;
    }
  });
  writeSync(1, "\n" + rows.join("\n") + "\n\nFlags to investigate: NO-POSTS, CATEGORY-AS-POST, NO-SEATS, SUM≠declared, NO-DATES\n");
}, 120_000);
