"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Instagram, WhatsApp } from "./icons";
import { Magnetic, prefersReducedMotion } from "./fx";
import { ROTATING, PHONE } from "./data";
import type { Links } from "./Nav";

export interface HeroPost {
  img: string;
  title: string;
  sample: boolean;
}

/** Drifting red particles that connect to each other and to the cursor. Pauses when off-screen. */
function Network() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, raf = 0, visible = true;
    const mouse = { x: -999, y: -999 };
    type P = { x: number; y: number; vx: number; vy: number; r: number };
    let pts: P[] = [];
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(80, Math.floor((w * h) / 16000));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.6 + 0.6 }));
    };
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 130) { p.x += (dx / d) * 0.9; p.y += (dy / d) * 0.9; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fillStyle = "rgba(255,90,105,.75)"; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
          if (d < 120) { ctx.strokeStyle = `rgba(226,27,45,${0.28 * (1 - d / 120)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
        }
        const dm = Math.hypot(pts[i].x - mouse.x, pts[i].y - mouse.y);
        if (dm < 170) { ctx.strokeStyle = `rgba(255,120,130,${0.55 * (1 - dm / 170)})`; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke(); }
      }
    };
    const onMove = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; };
    const onLeave = () => { mouse.x = mouse.y = -999; };
    resize();
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    addEventListener("resize", resize);
    canvas.parentElement?.addEventListener("pointermove", onMove);
    canvas.parentElement?.addEventListener("pointerleave", onLeave);
    frame();
    return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener("resize", resize); canvas.parentElement?.removeEventListener("pointermove", onMove); canvas.parentElement?.removeEventListener("pointerleave", onLeave); };
  }, []);
  return <canvas ref={ref} className="lp-net" aria-hidden />;
}

/** Types and erases the rotating word. Shows the first word statically for reduced motion. */
function Typewriter() {
  const [state, setState] = useState({ i: 0, len: ROTATING[0].length, del: false });
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const word = ROTATING[state.i];
    let t: ReturnType<typeof setTimeout>;
    if (!state.del && state.len === word.length) t = setTimeout(() => setState((s) => ({ ...s, del: true })), 1700);
    else if (state.del && state.len === 0) t = setTimeout(() => setState({ i: (state.i + 1) % ROTATING.length, len: 0, del: false }), 250);
    else t = setTimeout(() => setState((s) => ({ ...s, len: s.len + (s.del ? -1 : 1) })), state.del ? 32 : 68);
    return () => clearTimeout(t);
  }, [state]);
  return <span className="lp-type">{ROTATING[state.i].slice(0, state.len)}<i className="lp-caret" /></span>;
}

function Phone({ post }: { post: HeroPost }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType === "touch" || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
  };
  return (
    <div className="lp-stage" ref={ref} onPointerMove={move} onPointerLeave={() => { ref.current?.style.setProperty("--px", "0"); ref.current?.style.setProperty("--py", "0"); }}>
      <div className="lp-chip c1">📊 Seat-wise details</div>
      <div className="lp-chip c2">🗂️ Category-wise seats</div>
      <div className="lp-chip c3">⏰ Last-date alerts</div>
      <div className="lp-phone">
        <div className="lp-phone-notch" />
        <div className="lp-wa-head">
          <span className="lp-wa-av">F</span>
          <div><b>FOSLA Cyber Cafe</b><small>Channel · Jobs &amp; updates</small></div>
        </div>
        <div className="lp-wa-body">
          <div className="lp-wa-day">TODAY</div>
          <div className="lp-bubble b1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.img} alt={post.title} width={1080} height={1350} />
            {post.sample ? <span className="lp-sample-tag">SAMPLE POST</span> : null}
            <p><b>🔔 NEW RECRUITMENT</b><br />Full seat-wise details below 👇</p>
            <time>9:41 am</time>
          </div>
          <div className="lp-bubble b2">
            <p>📞 <b>{PHONE}</b><br />Want us to fill this form for you? Message or call us.</p>
            <time>9:41 am</time>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero({ links, post }: { links: Links; post: HeroPost }) {
  const ref = useRef<HTMLElement>(null);
  const spot = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <section id="top" className="lp-hero" ref={ref} onPointerMove={spot}>
      <div className="lp-aurora" aria-hidden><i /><i /><i /></div>
      <div className="lp-grid" aria-hidden />
      <Network />
      <div className="lp-spot" aria-hidden />
      <div className="lp-wrap lp-hero-in">
        <div className="lp-hero-copy">
          <div className="lp-pill"><span className="lp-live" /> Live from Mandi, Himachal Pradesh</div>
          <h1>
            Never miss a<br />
            <span className="lp-grad"><Typewriter /></span><br />
            update again.
          </h1>
          <p className="lp-deva" lang="hi">सरकारी नौकरी की हर खबर, सीधे आपके WhatsApp पर।</p>
          <p className="lp-lead">
            We watch the top job sites for you and turn every notification into a clear, seat-wise post: posts, category-wise vacancies, dates and fees.
            Found your job? Walk into our cafe and we&apos;ll fill the form.
          </p>
          <div className="lp-cta">
            <Magnetic><a href={links.join} target="_blank" rel="noopener" className="lp-btn lp-btn-lg wa pulse"><WhatsApp width={22} height={22} /> Join our WhatsApp Channel <Arrow width={18} height={18} /></a></Magnetic>
            {links.instagram ? <Magnetic><a href={links.instagram} target="_blank" rel="noopener" className="lp-btn lp-btn-lg ig"><Instagram width={22} height={22} /> Instagram</a></Magnetic> : null}
          </div>
          <ul className="lp-trust">
            <li>✓ Free to join</li><li>✓ Seat-wise details</li><li>✓ Form-filling help in Mandi</li>
          </ul>
        </div>
        <Phone post={post} />
      </div>
      <a href="#ticker" className="lp-scroll" aria-label="Scroll down"><span /></a>
    </section>
  );
}
