"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true);
    setMsg("Checking all sites… this takes up to a minute.");
    try {
      const res = await fetch("/api/admin/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMsg(`Found ${data.discovered} items, ${data.created} new post${data.created === 1 ? "" : "s"} prepared${data.refreshed ? `, ${data.refreshed} completed` : ""}${data.posted ? `, ${data.posted} posted` : ""}.`);
      router.refresh();
    } catch (e) {
      setMsg(`Failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button className="btn red" onClick={run} disabled={busy}>{busy ? "Fetching…" : "⟳ Fetch new jobs now"}</button>
      {msg ? <span className="meta">{msg}</span> : null}
    </div>
  );
}
