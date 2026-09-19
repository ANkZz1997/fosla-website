/** Business identity, taken from the FOSLA Cyber Cafe website. */
export const BRAND = {
  name: "FOSLA Cyber Cafe",
  short: "FOSLA",
  place: "Mandi, Himachal Pradesh",
  phones: ["9817897344", "7834010065"],
  whatsapp: "9817897344",
  address: "Shop No. 26, Tibetan Market, Near Police Thana Sadar, Mandi, HP 175001",
  hours: "9:00 AM – 8:00 PM, Monday to Sunday",
  services: "Online Forms • Print • Scan • Xerox • Photos • Scholarships • Admissions",
} as const;

export const env = {
  get adminPassword() {
    return process.env.ADMIN_PASSWORD ?? "";
  },
  get sessionSecret() {
    return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get publishMode(): "manual" | "bridge" {
    return process.env.PUBLISH_MODE === "bridge" ? "bridge" : "manual";
  },
  get autoPost() {
    return process.env.AUTO_POST === "true";
  },
  get bridgeUrl() {
    return (process.env.BRIDGE_URL ?? "").replace(/\/$/, "");
  },
  get bridgeToken() {
    return process.env.BRIDGE_TOKEN ?? "";
  },
  get channelUrl() {
    return process.env.WHATSAPP_CHANNEL_URL ?? "";
  },
  get instagramUrl() {
    return process.env.INSTAGRAM_URL ?? "";
  },
  get aiKey() {
    return process.env.ANTHROPIC_API_KEY ?? "";
  },
  get aiModel() {
    return process.env.AI_MODEL || "claude-opus-5";
  },
  get maxNewPerRun() {
    const n = Number(process.env.MAX_NEW_PER_RUN);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
  },
  get onlyHp() {
    return process.env.JOB_SCOPE === "only_hp";
  },
  get appUrl() {
    return (process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "")).replace(/\/$/, "");
  },
};
