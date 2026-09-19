"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Arrow, Check, External, Instagram, Lock, Phone, Pin, WhatsApp } from "./icons";
import { Magnetic, Reveal, Tilt } from "./fx";
import { ADDRESS, CHECKLISTS, MAPS, PHONE, PHONE2, PORTALS, SERVICES, chatLink } from "./data";
import type { Links } from "./Nav";

export function Services() {
  const [g, setG] = useState<"all" | "gov" | "cafe">("all");
  const list = SERVICES.filter((s) => g === "all" || s.group === g);
  return (
    <section className="lp-sec" id="services">
      <div className="lp-wrap">
        <Reveal className="lp-head">
          <span className="lp-eyebrow">Services</span>
          <h2 className="lp-h2">All your digital needs <em>under one roof.</em></h2>
          <p className="lp-sub">From government forms to a passport photo in minutes. Tap a card to ask us on WhatsApp.</p>
        </Reveal>
        <Reveal className="lp-filters" delay={60}>
          {([["all", "All services"], ["gov", "Government & education"], ["cafe", "Cafe services"]] as const).map(([k, l]) => (
            <button key={k} className={g === k ? "on" : ""} onClick={() => setG(k)}>{l}</button>
          ))}
        </Reveal>
        <div className="lp-svc-grid">
          {list.map((s, i) => (
            <Reveal key={s.title} delay={(i % 4) * 70}>
              <Tilt>
                <a className="lp-svc" href={chatLink(`Hi FOSLA Cyber Cafe, I need help with ${s.title}.`)} target="_blank" rel="noopener">
                  <span className="lp-ico">{s.icon}</span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <span className="lp-svc-go">Ask us <Arrow width={15} height={15} /></span>
                </a>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Portals() {
  const [id, setId] = useState(PORTALS[0].id);
  const p = PORTALS.find((x) => x.id === id)!;
  return (
    <section className="lp-sec lp-alt" id="portals">
      <div className="lp-wrap">
        <Reveal className="lp-head">
          <span className="lp-eyebrow">Quick portals</span>
          <h2 className="lp-h2">The official links, <em>one tap away.</em></h2>
          <p className="lp-sub">Direct links to the portals students and job seekers use most. Prefer not to do it yourself? We&apos;ll do it for you.</p>
        </Reveal>
        <Reveal className="lp-portals" delay={80}>
          <div className="lp-ptabs" role="tablist" aria-label="Portals">
            {PORTALS.map((x) => (
              <button key={x.id} role="tab" aria-selected={id === x.id} className={id === x.id ? "on" : ""} onClick={() => setId(x.id)}>
                <span>{x.icon}</span> {x.label}
              </button>
            ))}
          </div>
          <div className="lp-plist" key={p.id}>
            <p>{p.blurb}</p>
            <ul>
              {p.links.map((l, i) => (
                <li key={l.href} style={{ "--i": i } as React.CSSProperties}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer"><span className="lp-num">{i + 1}</span><b>{l.label}</b><External width={16} height={16} /></a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Pick what you're applying for and tick documents off. The lists are typical; the cafe confirms the exact ones. */
export function Checklist() {
  const [pid, setPid] = useState(CHECKLISTS[0].id);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const c = CHECKLISTS.find((x) => x.id === pid)!;
  const count = c.items.filter((i) => done[`${pid}:${i}`]).length;
  const pct = Math.round((count / c.items.length) * 100);
  const ready = count === c.items.length;
  return (
    <section className="lp-sec" id="documents">
      <div className="lp-wrap">
        <Reveal className="lp-head">
          <span className="lp-eyebrow">Be ready</span>
          <h2 className="lp-h2">Arrive with the right documents, <em>save a second trip.</em></h2>
          <p className="lp-sub">Choose what you&apos;re applying for and tick off what you have. This is a typical list; we&apos;ll confirm the exact documents for your form.</p>
        </Reveal>
        <Reveal className="lp-check" delay={80}>
          <div className="lp-check-l">
            <div className="lp-picks">
              {CHECKLISTS.map((x) => <button key={x.id} className={pid === x.id ? "on" : ""} onClick={() => setPid(x.id)}><span>{x.icon}</span>{x.label}</button>)}
            </div>
            <div className="lp-ring" style={{ "--p": pct } as React.CSSProperties}><div><b>{count}/{c.items.length}</b><small>{ready ? "all set" : "ready"}</small></div></div>
          </div>
          <div className="lp-check-r">
            <ul key={pid}>
              {c.items.map((it, i) => {
                const k = `${pid}:${it}`;
                return (
                  <li key={it} style={{ "--i": i } as React.CSSProperties}>
                    <label className={done[k] ? "on" : ""}>
                      <input type="checkbox" checked={!!done[k]} onChange={() => setDone((d) => ({ ...d, [k]: !d[k] }))} />
                      <span className="lp-box"><Check width={14} height={14} /></span>
                      <span>{it}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <a className={`lp-btn ${ready ? "wa pulse" : "ghost"}`} target="_blank" rel="noopener" href={chatLink(`Hi FOSLA Cyber Cafe, I have my documents ready for a ${c.label} form. When can I come?`)}>
              <WhatsApp /> {ready ? "You're ready. Message us" : "Message us anyway"}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function OpenNow() {
  const [s, setS] = useState<{ open: boolean } | null>(null);
  useEffect(() => {
    const calc = () => {
      const h = Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
      setS({ open: h >= 9 && h < 20 });
    };
    calc();
    const t = setInterval(calc, 60_000);
    return () => clearInterval(t);
  }, []);
  if (!s) return <span className="lp-open">&nbsp;</span>;
  return <span className={`lp-open ${s.open ? "yes" : "no"}`}><i />{s.open ? "Open now · closes 8:00 PM" : "Closed now · opens 9:00 AM"}</span>;
}

export function Visit() {
  return (
    <section className="lp-sec lp-alt" id="visit">
      <div className="lp-wrap">
        <Reveal className="lp-head">
          <span className="lp-eyebrow">Visit us</span>
          <h2 className="lp-h2">Right in the heart of <em>Mandi.</em></h2>
        </Reveal>
        <div className="lp-visit">
          <Reveal className="lp-visit-card" delay={60}>
            <OpenNow />
            <div className="lp-item"><Pin /><div><small>Address</small><b>{ADDRESS}</b></div></div>
            <div className="lp-item"><Phone /><div><small>Call</small><b><a href={`tel:+91${PHONE}`}>{PHONE}</a>, <a href={`tel:+91${PHONE2}`}>{PHONE2}</a></b></div></div>
            <div className="lp-item"><WhatsApp /><div><small>WhatsApp</small><b><a href={chatLink("Hi FOSLA Cyber Cafe")} target="_blank" rel="noopener">{PHONE}</a></b></div></div>
            <div className="lp-item"><span className="lp-clock">🕘</span><div><small>Hours</small><b>9:00 AM – 8:00 PM · Monday to Sunday</b></div></div>
            <div className="lp-visit-btns">
              <a className="lp-btn wa" href={chatLink("Hi FOSLA Cyber Cafe")} target="_blank" rel="noopener"><WhatsApp /> WhatsApp us</a>
              <a className="lp-btn ghost" href={`tel:+91${PHONE}`}><Phone /> Call</a>
              <a className="lp-btn ghost" href={MAPS} target="_blank" rel="noopener"><Pin /> Directions</a>
            </div>
          </Reveal>
          <Reveal delay={140} className="lp-map-wrap">
            <a className="lp-map" href={MAPS} target="_blank" rel="noopener" aria-label="Open FOSLA Cyber Cafe in Google Maps">
              <span className="lp-map-streets" aria-hidden />
              <span className="lp-pin" aria-hidden><i /><i /><Pin width={30} height={30} /></span>
              <span className="lp-map-label"><b>FOSLA Cyber Cafe</b><small>Tibetan Market, Mandi</small></span>
              <span className="lp-btn wa lp-map-btn"><Pin width={18} height={18} /> Open in Google Maps</span>
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ links }: { links: Links }) {
  return (
    <section className="lp-final" id="final">
      <div className="lp-wrap">
        <Reveal className="lp-final-card">
          <div className="lp-aurora small" aria-hidden><i /><i /></div>
          <h2 className="lp-h2">The next notification is <em>already on its way.</em></h2>
          <p>Join the channel and be the first to know. Free, and you can leave anytime.</p>
          <div className="lp-cta center">
            <Magnetic><a href={links.join} target="_blank" rel="noopener" className="lp-btn lp-btn-lg wa pulse"><WhatsApp width={22} height={22} /> Join our WhatsApp Channel</a></Magnetic>
            {links.instagram ? <Magnetic><a href={links.instagram} target="_blank" rel="noopener" className="lp-btn lp-btn-lg ig"><Instagram width={22} height={22} /> Follow on Instagram</a></Magnetic> : null}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer({ links, admin = false }: { links: Links; admin?: boolean }) {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap lp-foot-in">
        <div>
          <div className="lp-logo"><span className="lp-logo-mark">F</span><span>FOSLA <b>CYBER CAFE</b></span></div>
          <p>Print • Scan • Xerox • Forms • Internet • Typing • ID Cards<br />Tibetan Market, Mandi, Himachal Pradesh</p>
        </div>
        <div className="lp-foot-links">
          <a href={links.join} target="_blank" rel="noopener">WhatsApp Channel</a>
          {links.instagram ? <a href={links.instagram} target="_blank" rel="noopener">Instagram</a> : null}
          <a href="#services">Services</a>
          <a href="#visit">Visit us</a>
          <Link href="/admin" prefetch={false}><Lock width={14} height={14} /> {admin ? "Dashboard" : "Admin login"}</Link>
          {admin ? (
            <form method="post" action="/api/admin/logout"><input type="hidden" name="next" value="/" /><button type="submit" className="lp-linkbtn">Log out</button></form>
          ) : null}
        </div>
      </div>
      <div className="lp-wrap lp-legal">
        <p>© {new Date().getFullYear()} FOSLA Cyber Cafe. We are a private cyber cafe and are not connected to any government department. Job details are compiled from public websites: always confirm dates and eligibility on the official notification before applying.</p>
      </div>
    </footer>
  );
}

export function Fab() {
  const [on, setOn] = useState(false);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const f = () => setOn(scrollY > 600);
    f();
    addEventListener("scroll", f, { passive: true });
    // These sections already carry the same actions; don't cover their buttons.
    const seen = new Set<Element>();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      setAway(seen.size > 0);
    });
    document.querySelectorAll("#visit, #final").forEach((el) => io.observe(el));
    return () => { removeEventListener("scroll", f); io.disconnect(); };
  }, []);
  return (
    <a className={`lp-fab ${on ? "on" : ""} ${away ? "away" : ""}`} href={chatLink("Hi FOSLA Cyber Cafe, I need help with an online form.")} target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">
      <WhatsApp width={28} height={28} /><span>Chat with us</span>
    </a>
  );
}
