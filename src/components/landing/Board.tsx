"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LandingJob } from "@/lib/landing-data";
import { Arrow, Close, WhatsApp } from "./icons";
import { Reveal, Tilt } from "./fx";
import { chatLink } from "./data";
import type { Links } from "./Nav";

const DAY = 86_400_000;
const PAGE = 12;

const CAT_LABEL: Record<string, string> = {
  job: "Jobs",
  admission: "Admissions",
  "admit-card": "Admit cards",
  result: "Results",
  "answer-key": "Answer keys",
};
const CARD_LABEL: Record<string, string> = {
  job: "Recruitment",
  admission: "Admission",
  "admit-card": "Admit card",
  result: "Result",
  "answer-key": "Answer key",
};
const CAT_ORDER = ["job", "admission", "admit-card", "result", "answer-key"];

type Sort = "new" | "closing" | "posts";

const daysLeft = (j: LandingJob, now: number) => (j.deadline ? Math.ceil((Date.parse(j.deadline) - now) / DAY) : undefined);

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function ago(iso: string, now: number) {
  const d = Math.floor((now - Date.parse(iso)) / DAY);
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
}

/** Circular countdown: colour and pulse escalate as the deadline nears. */
function Ring({ days }: { days: number }) {
  const C = 2 * Math.PI * 18;
  const frac = Math.max(0.06, Math.min(1, days / 30));
  return (
    <div className="lp-dring" style={{ "--c": C, "--off": C * (1 - frac) } as React.CSSProperties}>
      <svg viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r="18" className="bg" />
        <circle cx="22" cy="22" r="18" className="fg" />
      </svg>
      <b>{days <= 0 ? "0" : days}</b>
    </div>
  );
}

function JobCard({ j, i, now, links, onPoster }: { j: LandingJob; i: number; now: number; links: Links; onPoster?: (j: LandingJob) => void }) {
  const d = daysLeft(j, now);
  const urgency = d === undefined ? "none" : d <= 3 ? "hot" : d <= 10 ? "warm" : "cool";
  const isNew = now - Date.parse(j.createdAt) < 3 * DAY;
  const isJob = j.category === "job";
  const more = j.postCount - Math.min(3, j.posts.length);

  return (
    <Reveal delay={(i % 3) * 80}>
      <Tilt max={4}>
        <article className={`lp-jc ${urgency}`}>
          <div className="lp-tags">
            <span>{CARD_LABEL[j.category] ?? j.category}</span>
            {j.hp ? <span className="hp">HP</span> : null}
            {isNew ? <span className="new">NEW</span> : null}
            {urgency === "hot" && isJob ? <span className="soon">CLOSING SOON</span> : null}
          </div>

          <h3>{j.title}</h3>
          {j.org ? <p className="lp-jc-org">{j.org}</p> : null}

          <div className="lp-jc-stats">
            <div><small>{isJob ? "Total posts" : "Update"}</small><b>{isJob ? (j.total ?? "Various") : CARD_LABEL[j.category]}</b></div>
            <div><small>{isJob ? "Apply mode" : "Published"}</small><b>{isJob ? (j.mode ?? "See post") : ago(j.createdAt, now)}</b></div>
            {d !== undefined && isJob ? (
              <div className="dl">
                <Ring days={d} />
                <span><small>{d <= 0 ? "Last day to apply" : d === 1 ? "day left to apply" : "days left to apply"}</small><em>{j.deadline ? fmtDate(j.deadline) : j.lastDate}</em></span>
              </div>
            ) : (
              <div className="dl"><span><small>{isJob ? "Last date" : "Added"}</small><em>{isJob ? (j.lastDate ?? "See post") : ago(j.createdAt, now)}</em></span></div>
            )}
          </div>

          {j.posts.length > 0 ? (
            <ul className="lp-jc-posts">
              {j.posts.slice(0, 3).map((p, k) => (
                <li key={p.post + k}><span>{p.post}</span>{p.seats !== undefined ? <b>{p.seats} {p.seats === 1 ? "seat" : "seats"}</b> : null}</li>
              ))}
              {more > 0 ? <li className="more">+ {more} more {more === 1 ? "post" : "posts"} in the channel</li> : null}
            </ul>
          ) : (
            <p className="lp-jc-note">Seat-wise details, dates and the official link are in our channel post.</p>
          )}

          <div className="lp-jc-foot">
            <a className="lp-btn wa lp-btn-sm lp-apply" href={links.join} target="_blank" rel="noopener">
              <WhatsApp width={16} height={16} /> {isJob ? "Apply" : "View update"} <Arrow width={15} height={15} />
            </a>
            <a className="lp-btn ghost lp-btn-sm" target="_blank" rel="noopener" aria-label={`Ask us about ${j.title}`}
              href={chatLink(`Hi FOSLA Cyber Cafe, I saw "${j.title}" on your website. Please help me apply.`)}>
              Ask us
            </a>
            {j.posted && onPoster ? <button className="lp-btn ghost lp-btn-sm" onClick={() => onPoster(j)}>Poster</button> : null}
          </div>
        </article>
      </Tilt>
    </Reveal>
  );
}

/** Full-size poster viewer. Closes on click or Escape. */
function PosterLightbox({ id, onClose }: { id: string; onClose: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [onClose]);
  return (
    <div className="lp-lightbox" role="dialog" aria-modal="true" aria-label="Poster" onClick={onClose}>
      <button className="lp-lb-x" aria-label="Close" onClick={onClose}><Close /></button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/poster/${id}`} alt="Job poster" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/** Shown while there are no open jobs: a labelled sample of how a channel post looks. */
function EmptyBoard({ links }: { links: Links }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Reveal className="lp-empty">
        <button className="lp-poster-btn" onClick={() => setOpen(true)} aria-label="View sample post full size">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/poster/sample" alt="Sample FOSLA job post" loading="lazy" width={1080} height={1350} />
          <span className="lp-sample-tag">SAMPLE POST</span>
        </button>
        <div>
          <h3>New openings land here first.</h3>
          <p>Every open job we find is listed here with its seats, deadline and an Apply button. This is how a post looks in our channel.</p>
          <a href={links.join} target="_blank" rel="noopener" className="lp-btn wa"><WhatsApp /> Join the channel <Arrow width={18} height={18} /></a>
        </div>
      </Reveal>
      {open ? <PosterLightbox id="sample" onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Jobs that are still open right now. A cached page can be minutes old, so re-check against the clock. */
function useLive(jobs: LandingJob[], serverNow: number) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const live = useMemo(() => jobs.filter((j) => !j.deadline || Date.parse(j.deadline) >= now), [jobs, now]);
  const openings = live.filter((j) => j.category === "job").length;
  const soon = live.filter((j) => j.category === "job" && (daysLeft(j, now) ?? 99) <= 3).length;
  return { now, live, openings, soon };
}

/** Home page: the newest few openings and a button to the full board, so the page stays short. */
export function JobsPreview({ jobs, links, serverNow }: { jobs: LandingJob[]; links: Links; serverNow: number }) {
  const { now, live, openings, soon } = useLive(jobs, serverNow);
  const top = useMemo(() => [...live].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3), [live]);

  return (
    <section className="lp-sec lp-alt" id="updates">
      <div className="lp-wrap">
        <Reveal className="lp-head">
          <span className="lp-eyebrow"><i className="lp-live" /> Live job board</span>
          <h2 className="lp-h2">Latest openings, <em>live right now.</em></h2>
          <p className="lp-sub">
            {live.length > 0
              ? <>{openings} {openings === 1 ? "opening is" : "openings are"} open right now{soon ? <>, <b className="lp-warn">{soon} closing within 3 days</b></> : null}. Here are the newest. Open the job board to search, filter and see them all.</>
              : <>Fresh openings appear here the moment we find them. Join the channel so you never miss one.</>}
          </p>
        </Reveal>

        {top.length === 0 ? (
          <EmptyBoard links={links} />
        ) : (
          <>
            <div className="lp-jobs preview">
              {top.map((j, i) => <JobCard key={j.id} j={j} i={i} now={now} links={links} />)}
            </div>
            <Reveal className="lp-preview-cta" delay={120}>
              <Link href="/jobs" className="lp-btn red lp-btn-lg">View all jobs <span className="lp-count">{live.length}</span> <Arrow width={18} height={18} /></Link>
              <a href={links.join} target="_blank" rel="noopener" className="lp-btn ghost lp-btn-lg"><WhatsApp width={20} height={20} /> Join the channel</a>
            </Reveal>
          </>
        )}
      </div>
    </section>
  );
}

/** The /jobs page: search, filters, sorting and every open job. */
export function Board({ jobs, links, serverNow, updatedLabel }: { jobs: LandingJob[]; links: Links; serverNow: number; updatedLabel: string }) {
  const { now, live, openings, soon } = useLive(jobs, serverNow);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [hpOnly, setHpOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("new");
  const [shown, setShown] = useState(PAGE);
  const [poster, setPoster] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: live.length };
    for (const j of live) c[j.category] = (c[j.category] ?? 0) + 1;
    return c;
  }, [live]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = live.filter(
      (j) =>
        (cat === "all" || j.category === cat) &&
        (!hpOnly || j.hp) &&
        (!needle || `${j.title} ${j.org ?? ""} ${j.posts.map((p) => p.post).join(" ")}`.toLowerCase().includes(needle)),
    );
    const far = 9e15;
    const num = (j: LandingJob) => Number((j.total ?? "").replace(/[^\d]/g, "")) || 0;
    return out.sort((a, b) =>
      sort === "closing" ? (a.deadline ? Date.parse(a.deadline) : far) - (b.deadline ? Date.parse(b.deadline) : far)
      : sort === "posts" ? num(b) - num(a)
      : Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [live, q, cat, hpOnly, sort]);

  useEffect(() => setShown(PAGE), [q, cat, hpOnly, sort]);

  const cats = CAT_ORDER.filter((c) => counts[c]);

  return (
    <section className="lp-sec lp-alt lp-page" id="jobs">
      <div className="lp-aurora" aria-hidden><i /><i /><i /></div>
      <div className="lp-wrap">
        <Link href="/" className="lp-back">← Back to home</Link>
        <Reveal className="lp-head">
          <span className="lp-eyebrow"><i className="lp-live" /> Live job board</span>
          <h1 className="lp-h2">Every open job, <em>all in one place.</em></h1>
          <p className="lp-sub">
            {live.length > 0
              ? <>{openings} openings{live.length - openings > 0 ? <> and {live.length - openings} other updates</> : null} {live.length === 1 ? "is" : "are"} live right now{soon ? <>, <b className="lp-warn">{soon} closing within 3 days</b></> : null}. Tap <b>Apply</b> to open our WhatsApp channel, where the full seat-wise post and form-filling help are waiting.</>
              : <>Fresh openings appear here the moment we find them. Join the channel so you never miss one.</>}
          </p>
        </Reveal>

        {live.length === 0 ? (
          <EmptyBoard links={links} />
        ) : (
          <>
            <Reveal className="lp-bar" delay={60}>
              <label className="lp-search">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search jobs, departments or posts…" aria-label="Search jobs" />
                {q ? <button type="button" aria-label="Clear search" onClick={() => setQ("")}><Close width={16} height={16} /></button> : null}
              </label>
              <div className="lp-bar-row">
                <div className="lp-chipbar" role="group" aria-label="Category">
                  <button className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>All <span>{counts.all}</span></button>
                  {cats.map((c) => <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{CAT_LABEL[c]} <span>{counts[c]}</span></button>)}
                </div>
                <label className="lp-switch"><input type="checkbox" checked={hpOnly} onChange={(e) => setHpOnly(e.target.checked)} /><i /> Himachal only</label>
                <div className="lp-seg" role="group" aria-label="Sort">
                  {([["new", "Newest"], ["closing", "Closing soon"], ["posts", "Most posts"]] as const).map(([k, l]) => <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>{l}</button>)}
                </div>
              </div>
            </Reveal>

            {list.length === 0 ? (
              <div className="lp-nomatch">
                <b>No matches.</b> Try a different word or clear the filters.
                <button className="lp-btn ghost lp-btn-sm" onClick={() => { setQ(""); setCat("all"); setHpOnly(false); }}>Reset filters</button>
              </div>
            ) : (
              <div className="lp-jobs">
                {list.slice(0, shown).map((j, i) => <JobCard key={j.id} j={j} i={i} now={now} links={links} onPoster={(x) => setPoster(x.id)} />)}
              </div>
            )}

            <div className="lp-board-foot">
              <span>Showing {Math.min(shown, list.length)} of {list.length} · updated {updatedLabel} IST</span>
              {shown < list.length ? <button className="lp-btn ghost" onClick={() => setShown((s) => s + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button> : null}
            </div>

            <Reveal className="lp-board-cta">
              <div><b>Don&apos;t check every day.</b><span>Get each new opening on WhatsApp the moment it&apos;s posted. Free.</span></div>
              <a href={links.join} target="_blank" rel="noopener" className="lp-btn wa pulse"><WhatsApp /> Join the channel <Arrow width={18} height={18} /></a>
            </Reveal>
          </>
        )}
      </div>
      {poster ? <PosterLightbox id={poster} onClose={() => setPoster(null)} /> : null}
    </section>
  );
}
