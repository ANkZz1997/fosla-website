import { promises as fs } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { BRAND } from "../config";
import type { JobRecord } from "../types";
import { CATEGORY_LABEL, deriveFacts, hasSeatCounts } from "./model";

export const POSTER = { width: 1080, height: 1350 } as const;

const RED = "#b40010";
const RED2 = "#e21b2d";
const INK = "#141414";

let fontsPromise: Promise<{ regular: Buffer; bold: Buffer }> | undefined;
function loadFonts() {
  fontsPromise ??= (async () => {
    const dir = path.join(process.cwd(), "src/assets/fonts");
    const [regular, bold] = await Promise.all([
      fs.readFile(path.join(dir, "LiberationSans-Regular.ttf")),
      fs.readFile(path.join(dir, "LiberationSans-Bold.ttf")),
    ]);
    return { regular, bold };
  })();
  return fontsPromise;
}

interface Row {
  left: string;
  right?: string;
  sub?: string;
  /** Category-wise seats ("UR 64") shown as big chips: the number applicants look for first. */
  chips?: { k: string; v: string }[];
}

const toChips = (breakup: string | undefined) =>
  (breakup ?? "")
    .split(" · ")
    .map((part) => part.match(/^(.*?)\s+(\d+)$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ k: m[1], v: m[2] }))
    .slice(0, 16);

const STEPS: Record<string, string[]> = {
  "admit-card": ["Keep your roll / registration number ready", "Visit or WhatsApp us - we download it for you", "Get a clear colour printout on the spot"],
  result: ["Keep your roll / registration number ready", "We open the official result and check your marks", "Scorecard printout available at the shop"],
  admission: ["Bring Aadhaar, photo, marksheets & certificates", "We fill and submit the online form", "You get the receipt and a printed copy"],
  default: ["Message us the update you are interested in", "We tell you the documents required", "We complete the process for you"],
};

function buildRows(job: JobRecord): { title: string; rows: Row[]; more: number } {
  const d = job.details;
  if (d.postWise.length) {
    const max = 6;
    const showChips = d.postWise.length <= 2;
    const showSub = !showChips && d.postWise.length <= 4;
    return {
      title: hasSeatCounts(job) ? "POST-WISE VACANCY" : "POSTS INCLUDED",
      more: Math.max(0, d.postWise.length - max),
      rows: d.postWise.slice(0, max).map((p) => ({
        left: p.post,
        right: p.seats !== undefined ? `${p.seats} ${p.seats === 1 ? "seat" : "seats"}` : undefined,
        sub: showSub ? p.breakup : undefined,
        chips: showChips ? toChips(p.breakup) : undefined,
      })),
    };
  }
  const info = [
    ...d.qualification.slice(0, 2).map((q) => ({ left: `Qualification: ${q.label}`, right: undefined, sub: q.value })),
    ...d.age.slice(0, 2).map((a) => ({ left: `Age ${a.label}`, right: a.value })),
    ...d.fees.slice(0, 2).map((x) => ({ left: `Fee ${x.label}`, right: x.value })),
  ] as Row[];
  if (info.length && job.category === "job") return { title: "KEY DETAILS", rows: info.slice(0, 6), more: 0 };
  const steps = STEPS[job.category] ?? STEPS.default;
  return { title: "HOW WE CAN HELP", rows: steps.map((s, i) => ({ left: `${i + 1}.  ${s}` })), more: 0 };
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#fff", border: "2px solid #ddd", borderTop: `8px solid ${RED}`, borderRadius: 10, padding: "16px 18px", maxHeight: 132, overflow: "hidden" }}>
      <div style={{ display: "flex", fontSize: 20, color: "#777", letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div style={{ display: "flex", fontSize: value.length > 14 ? 30 : 40, fontWeight: 700, color: INK, marginTop: 6, lineClamp: 2 }}>{value}</div>
    </div>
  );
}

function Poster({ job }: { job: JobRecord }) {
  const f = deriveFacts(job);
  const { title: cardTitle, rows, more } = buildRows(job);
  const titleSize = f.title.length < 55 ? 66 : f.title.length < 95 ? 54 : 44;
  const tiles = [
    f.total && { label: "Total posts", value: f.total },
    f.lastDate && { label: f.lastLabel, value: f.lastDate },
    f.modeShort && { label: "Apply mode", value: f.modeShort },
    !f.modeShort && f.startDate && { label: "Start date", value: f.startDate },
  ].filter(Boolean) as { label: string; value: string }[];
  const posted = new Date(job.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

  return (
    <div style={{ width: POSTER.width, height: POSTER.height, display: "flex", flexDirection: "column", background: "#f4f4f4", fontFamily: "Liberation" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 120, padding: "0 48px", background: "linear-gradient(90deg,#080808,#260006,#080808)", borderBottom: `6px solid ${RED}` }}>
        <div style={{ display: "flex", fontSize: 50, fontWeight: 700, letterSpacing: 2 }}>
          <span style={{ color: "#fff" }}>FOSLA</span>
          <span style={{ color: "#ff2438", marginLeft: 14 }}>CYBER CAFE</span>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#ddd", letterSpacing: 2 }}>MANDI • HIMACHAL PRADESH</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "34px 48px 0" }}>
        <div style={{ display: "flex", background: `linear-gradient(135deg,${RED2},#78000a)`, color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: 2, padding: "12px 26px", borderRadius: 8 }}>
          {CATEGORY_LABEL[job.category]}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#777" }}>{job.hp ? "HP JOBS • " : ""}{posted}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", padding: "26px 48px 0" }}>
        <div style={{ display: "flex", fontSize: titleSize, fontWeight: 700, color: INK, lineHeight: 1.12, lineClamp: 4 }}>{f.title}</div>
        {f.org ? <div style={{ display: "flex", fontSize: 30, color: RED, fontWeight: 700, marginTop: 14, lineClamp: 1 }}>{f.org}</div> : null}
      </div>

      {tiles.length ? (
        <div style={{ display: "flex", gap: 18, padding: "26px 48px 0" }}>
          {tiles.slice(0, 3).map((t) => (
            <Tile key={t.label} {...t} />
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", flex: 1, margin: "26px 48px 0", background: "#fff", border: "2px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", background: "#111", color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: 2, padding: "14px 26px", borderBottom: `4px solid ${RED}` }}>{cardTitle}</div>
        <div style={{ display: "flex", flexDirection: "column", padding: "6px 26px" }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", padding: "12px 0", borderBottom: i === rows.length - 1 ? "none" : "1px solid #eee" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", fontSize: 29, color: INK, fontWeight: 700, flex: 1, lineClamp: 1, marginRight: 16 }}>{r.left}</div>
                {r.right ? (
                  <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#fff", background: RED, padding: "6px 16px", borderRadius: 20, whiteSpace: "nowrap" }}>{r.right}</div>
                ) : null}
              </div>
              {r.sub ? <div style={{ display: "flex", fontSize: 21, color: "#666", marginTop: 4, lineClamp: 1 }}>{r.sub}</div> : null}
              {r.chips?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
                  {r.chips.map((c) => (
                    <div key={c.k} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 118, padding: "8px 14px", background: "#faf3f3", border: "2px solid #ecc", borderRadius: 10 }}>
                      <div style={{ display: "flex", fontSize: 19, color: "#777", lineClamp: 1 }}>{c.k}</div>
                      <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: RED }}>{c.v}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {more ? <div style={{ display: "flex", fontSize: 24, color: RED, fontWeight: 700, padding: "10px 0 4px" }}>+ {more} more posts - full list in the message below</div> : null}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 26, background: "#090909", borderTop: `6px solid ${RED}`, padding: "22px 48px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#fff" }}>
              {job.category === "job" || job.category === "admission" ? "GET YOUR FORM FILLED HERE" : "NEED HELP? VISIT US"}
            </div>
            <div style={{ display: "flex", fontSize: 21, color: "#bbb", marginTop: 6 }}>{BRAND.services}</div>
          </div>
          <div style={{ display: "flex", background: `linear-gradient(135deg,${RED2},#78000a)`, color: "#fff", fontSize: 38, fontWeight: 700, padding: "12px 22px", borderRadius: 8 }}>{BRAND.whatsapp}</div>
        </div>
        <div style={{ display: "flex", fontSize: 20, color: "#999", marginTop: 12 }}>{BRAND.address}</div>
      </div>
    </div>
  );
}

export async function renderPoster(job: JobRecord): Promise<ImageResponse> {
  const { regular, bold } = await loadFonts();
  return new ImageResponse(<Poster job={job} />, {
    ...POSTER,
    fonts: [
      { name: "Liberation", data: regular, weight: 400, style: "normal" },
      { name: "Liberation", data: bold, weight: 700, style: "normal" },
    ],
  });
}
