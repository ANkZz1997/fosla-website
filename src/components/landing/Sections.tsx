"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LandingJob } from "@/lib/landing-data";
import { Arrow, Check, Close, WhatsApp } from "./icons";
import { Counter, Reveal, Tilt } from "./fx";
import { ANATOMY, STEPS, TICKER, chatLink } from "./data";
import type { Links } from "./Nav";

export function Ticker() {
  const row = [...TICKER, ...TICKER];
  return (
    <div id="ticker" className="lp-ticker" aria-hidden>
      <div className="lp-ticker-track">
        {row.map((t, i) => <span key={i}>{t}<i /></span>)}
      </div>
    </div>
  );
}

export function Stats({ postedCount, sources, services }: { postedCount: number; sources: number; services: number }) {
  const tiles = [
    { to: sources, label: "Job sites we watch for you" },
    { to: services, label: "Services under one roof" },
    { to: 7, label: "Days open every week" },
    postedCount > 0 ? { to: postedCount, label: "Updates posted", suffix: "+" } : { to: 11, label: "Hours open every day" },
  ];
  return (
    <section className="lp-stats">
      <div className="lp-wrap lp-stats-grid">
        {tiles.map((t, i) => (
          <Reveal key={t.label} delay={i * 90} className="lp-stat">
            <b><Counter to={t.to} suffix={"suffix" in t ? t.suffix : ""} /></b>
            <span>{t.label}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Click through what every post contains. The example is illustrative, not a live notification. */
export function Anatomy() {
  const [tab, setTab] = useState("seats");
  const cur = ANATOMY.find((a) => a.id === tab)!;
  return (
    <section className="lp-sec" id="inside">
      <div className="lp-wrap">
        <Reveal className="lp-head">
          <span className="lp-eyebrow">Inside every post</span>
          <h2 className="lp-h2">Not just a headline. <em>Everything you need to decide.</em></h2>
          <p className="lp-sub">Most sites bury the details. We put them up front, so you know in ten seconds if a job is for you.</p>
        </Reveal>
        <div className="lp-anat">
          <Reveal className="lp-anat-tabs" delay={80}>
            <div role="tablist" aria-label="Post sections">
              {ANATOMY.map((a, i) => (
                <button key={a.id} role="tab" aria-selected={tab === a.id} className={tab === a.id ? "on" : ""} onClick={() => setTab(a.id)}>
                  <span className="lp-num">{i + 1}</span>
                  <span><b>{a.tab}</b><small>{a.hint}</small></span>
                </button>
              ))}
            </div>
          </Reveal>
          <Reveal className="lp-anat-card" delay={160}>
            <div className="lp-post-mock" key={tab}>
              <div className="lp-mock-top"><span className="lp-badge">NEW RECRUITMENT</span><span className="lp-example">Example format</span></div>
              <h3>Junior Assistant Recruitment 2026</h3>
              <p className="lp-mock-org">Example Department, Himachal Pradesh</p>
              {tab === "seats" && (
                <ul className="lp-rows">
                  {[["Junior Assistant", "80 seats"], ["Clerk", "30 seats"], ["Peon", "10 seats"]].map(([a, b]) => <li key={a}><span>{a}</span><b>{b}</b></li>)}
                  <li className="tot"><span>Total posts</span><b>120</b></li>
                </ul>
              )}
              {tab === "cats" && (
                <>
                  <p className="lp-mock-cap">Junior Assistant · 80 seats</p>
                  <div className="lp-chips">
                    {[["UR", 40], ["SC", 16], ["ST", 8], ["OBC", 12], ["EWS", 4]].map(([k, v]) => <div key={k as string}><small>{k}</small><b>{v}</b></div>)}
                  </div>
                </>
              )}
              {tab === "dates" && (
                <ul className="lp-rows">
                  {[["Last date", "31 December 2026"], ["Apply mode", "Online"], ["Total posts", "120"]].map(([a, b]) => <li key={a}><span>{a}</span><b>{b}</b></li>)}
                </ul>
              )}
              {tab === "links" && (
                <ul className="lp-rows links">
                  <li><span>✅ Apply online</span><b>Official website</b></li>
                  <li><span>📄 Notification</span><b>Official PDF</b></li>
                  <li><span>🖥️ Need help?</span><b>Call the cafe</b></li>
                </ul>
              )}
              <div className="lp-mock-foot">Shown exactly like this in the channel · {cur.tab}</div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const CAT_LABEL: Record<string, string> = { job: "Jobs", result: "Results", "admit-card": "Admit cards", admission: "Admissions", "answer-key": "Answer keys", syllabus: "Syllabus", other: "Updates" };

export function Feed({ jobs, links }: { jobs: LandingJob[]; links: Links }) {
  const [cat, setCat] = useState("all");
  const [box, setBox] = useState<{ src: string; title: string } | null>(null);
  const cats = useMemo(() => [...new Set(jobs.map((j) => j.category))], [jobs]);
  const shown = cat === "all" ? jobs : jobs.filter((j) => j.category === cat);

  useEffect(() => {
    if (!box) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && setBox(null);
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [box]);

  return (
    <section className="lp-sec lp-alt" id="updates">
      <div className="lp-wrap">
        <Reveal className="lp-head">
          <span className="lp-eyebrow">Latest from the channel</span>
          <h2 className="lp-h2">Fresh posts, <em>straight from our WhatsApp channel.</em></h2>
          <p className="lp-sub">Tap any poster to view it full size, or ask us to fill the form for you.</p>
        </Reveal>

        {jobs.length > 1 && (
          <Reveal className="lp-filters" delay={60}>
            {["all", ...cats].map((c) => <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c === "all" ? "All" : CAT_LABEL[c] ?? c}</button>)}
          </Reveal>
        )}

        {jobs.length === 0 ? (
          <Reveal className="lp-empty">
            <button className="lp-poster-btn" onClick={() => setBox({ src: "/api/poster/sample", title: "Sample post" })} aria-label="View sample post full size">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/poster/sample" alt="Sample FOSLA job post" loading="lazy" width={1080} height={1350} />
              <span className="lp-sample-tag">SAMPLE POST</span>
            </button>
            <div>
              <h3>Your first real post lands here.</h3>
              <p>Every job we publish in the channel appears in this feed with its poster. This is how they look. Join the channel so you see them the moment they&apos;re posted.</p>
              <a href={links.join} target="_blank" rel="noopener" className="lp-btn wa"><WhatsApp /> Join the channel <Arrow width={18} height={18} /></a>
            </div>
          </Reveal>
        ) : (
          <div className="lp-posts">
            {shown.map((j, i) => (
              <Reveal key={j.id} delay={(i % 3) * 90} className="lp-post">
                <Tilt max={5}>
                  <button className="lp-poster-btn" onClick={() => setBox({ src: `/api/poster/${j.id}`, title: j.title })} aria-label={`View poster: ${j.title}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/poster/${j.id}`} alt={j.title} loading="lazy" width={1080} height={1350} />
                  </button>
                  <div className="lp-post-b">
                    <div className="lp-tags"><span>{CAT_LABEL[j.category] ?? j.category}</span>{j.hp ? <span className="hp">HP</span> : null}</div>
                    <h3>{j.title}</h3>
                    <p className="lp-meta">{j.total ? <>📌 {j.total} posts</> : null}{j.total && j.lastDate ? " · " : ""}{j.lastDate ? <>⏳ {j.lastLabel}: {j.lastDate}</> : null}</p>
                    <a className="lp-btn lp-btn-sm wa" target="_blank" rel="noopener" href={chatLink(`Hi FOSLA Cyber Cafe, I saw "${j.title}" on your channel. Please help me apply.`)}>
                      <WhatsApp width={16} height={16} /> Get this form filled
                    </a>
                  </div>
                </Tilt>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {box && (
        <div className="lp-lightbox" role="dialog" aria-modal="true" aria-label={box.title} onClick={() => setBox(null)}>
          <button className="lp-lb-x" aria-label="Close" onClick={() => setBox(null)}><Close /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={box.src} alt={box.title} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  );
}

export function Steps() {
  const ref = useRef<HTMLOListElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setGo(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setGo(true), io.disconnect()), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section className="lp-sec" id="how">
      <div className="lp-wrap">
        <Reveal className="lp-head">
          <span className="lp-eyebrow">How it works</span>
          <h2 className="lp-h2">From notification to <em>submitted form</em> in four steps.</h2>
        </Reveal>
        <ol className={`lp-steps ${go ? "go" : ""}`} ref={ref}>
          <div className="lp-steps-line"><i /></div>
          {STEPS.map((s, i) => (
            <li key={s.n} style={{ "--i": i } as React.CSSProperties}>
              <span className="lp-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
