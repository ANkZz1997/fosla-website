"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Arrow, Close, Instagram, Lock, Menu, WhatsApp } from "./icons";
import { Magnetic } from "./fx";

export interface Links {
  join: string;
  instagram: string;
}

const NAV = [
  { href: "#updates", label: "Latest updates" },
  { href: "#services", label: "Services" },
  { href: "#how", label: "How it works" },
  { href: "#visit", label: "Visit us" },
];

function LogoutForm({ className = "lp-btn lp-btn-sm ghost" }: { className?: string }) {
  return (
    <form method="post" action="/api/admin/logout">
      <input type="hidden" name="next" value="/" />
      <button type="submit" className={className}><Close width={16} height={16} /> <span>Log out</span></button>
    </form>
  );
}

export function Nav({ links, admin = false }: { links: Links; admin?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const on = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setScrolled(scrollY > 24);
      setProgress(max > 0 ? scrollY / max : 0);
    };
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => void (document.body.style.overflow = "");
  }, [open]);

  return (
    <header className={`lp-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="lp-progress" style={{ transform: `scaleX(${progress})` }} />
      <div className="lp-wrap lp-nav-in">
        <a href="#top" className="lp-logo" aria-label="FOSLA Cyber Cafe, home">
          <span className="lp-logo-mark">F</span>
          <span>FOSLA <b>CYBER CAFE</b></span>
        </a>
        <nav className="lp-links" aria-label="Main">
          {NAV.map((n) => <a key={n.href} href={n.href}>{n.label}</a>)}
        </nav>
        <div className="lp-nav-cta">
          <Link href="/admin" className="lp-btn lp-btn-sm ghost" prefetch={false}><Lock width={16} height={16} /> <span>{admin ? "Dashboard" : "Admin login"}</span></Link>
          {admin ? <LogoutForm /> : null}
          <Magnetic>
            <a href={links.join} target="_blank" rel="noopener" className="lp-btn lp-btn-sm wa"><WhatsApp width={17} height={17} /> <span>Join channel</span></a>
          </Magnetic>
          <button className="lp-burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </div>
      <div className={`lp-drawer ${open ? "open" : ""}`}>
        {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label} <Arrow width={18} height={18} /></a>)}
        <a href={links.join} target="_blank" rel="noopener" className="lp-btn wa"><WhatsApp /> Join our WhatsApp Channel</a>
        {links.instagram ? <a href={links.instagram} target="_blank" rel="noopener" className="lp-btn ig"><Instagram /> Follow on Instagram</a> : null}
        <Link href="/admin" className="lp-btn ghost" prefetch={false}><Lock /> {admin ? "Open dashboard" : "Admin login"}</Link>
        {admin ? <LogoutForm className="lp-btn ghost" /> : null}
      </div>
    </header>
  );
}
