"use client";

import { useEffect, useRef, useState } from "react";
import { Counter, Reveal } from "./fx";
import { ANATOMY, STEPS, TICKER } from "./data";

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

export function Stats({ openCount, sources, services }: { openCount: number; sources: number; services: number }) {
  const tiles = [
    { to: sources, label: "Job sites we watch for you" },
    { to: services, label: "Services under one roof" },
    { to: 7, label: "Days open every week" },
    openCount > 0 ? { to: openCount, label: "Openings live right now" } : { to: 11, label: "Hours open every day" },
  ];
  return (
    <section className="lp-stats">
      <div className="lp-wrap lp-stats-grid">
        {tiles.map((t, i) => (
          <Reveal key={t.label} delay={i * 90} className="lp-stat">
            <b><Counter to={t.to} /></b>
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
