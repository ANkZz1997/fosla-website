import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractDetails } from "@/lib/extract/tables";

const fx = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), "utf8");

describe("freejobalert detail page (NIC, discipline-wise seats)", () => {
  const d = extractDetails(fx("fja-detail.html"), "https://www.freejobalert.com/articles/nic-x");
  it("reads the overview table", () => {
    expect(d.organization).toMatch(/National Informatics Centre/);
    expect(d.postName).toMatch(/Scientific\/Technical Assistant/);
    expect(d.totalVacancies).toMatch(/376/);
    expect(d.payScale).toMatch(/35,400/);
    expect(d.applicationMode).toBe("Online");
  });
  it("reads post-wise seats with category breakup", () => {
    expect(d.postWise).toHaveLength(3);
    expect(d.postWise[0]).toMatchObject({ post: "Computer Sciences & Information Technology", seats: 300 });
    expect(d.postWise[0].breakup).toBe("UR 122 · SC 45 · ST 22 · OBC(NCL) 81 · EWS 30");
    expect(d.postWise.reduce((s, p) => s + (p.seats ?? 0), 0)).toBe(376);
  });
  it("reads dates, age and fees", () => {
    expect(d.dates.some((x) => /closing date/i.test(x.label) && /30\.09\.2026/.test(x.value))).toBe(true);
    expect(d.age.find((x) => /OBC/.test(x.label))?.value).toBe("33 years");
    expect(d.fees.find((x) => /UR/.test(x.label))?.value).toMatch(/800/);
  });
  it("keeps only official (non-aggregator, non-social) links", () => {
    for (const l of d.links) {
      expect(l.value).not.toMatch(/freejobalert|t\.me|whatsapp|telegram/i);
    }
  });
});

describe("himexam detail page (category grid)", () => {
  const d = extractDetails(fx("himexam-detail.html"), "https://himexam.com/jal-shakti-vibhag-anni-recruitment-2026-para-cook-para-helper-posts/");
  it("reads the overview and dates", () => {
    expect(d.organization).toMatch(/Jal Shakti/);
    expect(d.applicationMode).toBe("Offline");
    expect(d.dates.some((x) => /last date/i.test(x.label) && /09 October 2026/.test(x.value))).toBe(true);
  });
  it("sums a UR/SC/OBC/EWS/ST grid into seats", () => {
    expect(d.postWise).toEqual([
      { post: "Para Cook", seats: 1, breakup: "UR 1" },
      { post: "Para Helper", seats: 1, breakup: "UR 1" },
    ]);
  });
  it("captures pay per post and the selection method", () => {
    expect(d.payScale).toBe("Para Cook: ₹9,000 per month · Para Helper: ₹5,500 per month");
    expect(d.selection).toBe("Merit/Eligibility Evaluation and Skill Test");
    expect(d.postName).toBe("Para Cook and Para Helper");
  });
});

describe("reservation-category table (HPPSC Medical Officer)", () => {
  const d = extractDetails(fx("fja-hppsc-mo.html"), "https://www.freejobalert.com/articles/hppsc-medical-officer-recruitment-2026-apply-online-for-228-posts-3068329");
  it("does not list reservation categories as posts", () => {
    expect(d.postWise.map((p) => p.post)).not.toContain("UR");
    expect(d.postWise).toHaveLength(1);
    expect(d.postWise[0].post).toBe("Medical Officer (General Wing)");
  });
  it("puts the category split in the breakup with the right total", () => {
    expect(d.postWise[0].seats).toBe(228);
    expect(d.postWise[0].breakup).toMatch(/^UR 64 ·/);
  });
});

describe("category breakup labels", () => {
  it("abbreviates HP reservation labels readably", () => {
    const d = extractDetails(fx("fja-hppsc-mo.html"), "https://www.freejobalert.com/articles/x");
    expect(d.postWise[0].breakup).toBe("UR 64 · UR/OH 24 · UR/ESM 53 · UR/WFF 2 · SC 19 · SC/ESM 8 · SC/WFF 3 · ST 9 · ST/OH 4 · ST/ESM 3 · OBC 18 · OBC/ESM 4 · OBC/WFF 2 · EWS 15");
  });
});

import { shortMode } from "@/lib/format/model";
describe("poster tile text", () => {
  it("shortens long application-mode sentences", () => {
    expect(shortMode("Application form to be filled by hand, scanned, and sent as a single PDF via e-mail")).toBe("By e-mail");
    expect(shortMode("Online")).toBe("Online");
    expect(shortMode("Walk-in Interview at the institute campus")).toBe("Walk-in");
  });
});

import { deriveFacts } from "@/lib/format/model";
import { SAMPLE_JOB } from "@/lib/format/sample";
describe("total posts", () => {
  it("drops remarks from the source cell", () => {
    const job = { ...SAMPLE_JOB, details: { ...SAMPLE_JOB.details, totalVacancies: "1,871 (post-wise breakup below)" } };
    expect(deriveFacts(job).total).toBe("1,871");
  });
  it("keeps a plain text total when there is no number", () => {
    const job = { ...SAMPLE_JOB, vacancies: undefined, details: { ...SAMPLE_JOB.details, totalVacancies: "Various" } };
    expect(deriveFacts(job).total).toBe("Various");
  });
});
