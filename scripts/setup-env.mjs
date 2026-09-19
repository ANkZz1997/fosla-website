// Prepares your .env: generates the secrets, adds missing keys, and tells you exactly what is still yours to fill in.
//   npm run setup:env            fill in .env
//   npm run setup:env -- --check just report, change nothing (exit code 1 if something required is missing)
//   npm run setup:env -- --fix-weak   also replace secrets/passwords that are too short or reused
//   npm run setup:env -- --file .env.production   use another file
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const check = args.includes("--check");
const fixWeak = args.includes("--fix-weak");
const fileArg = args.indexOf("--file");
const FILE = fileArg >= 0 ? args[fileArg + 1] : ".env";
const EXAMPLE = ".env.example";

const hex = (n) => randomBytes(n).toString("hex");
// Readable but strong: no look-alike characters.
const password = () => Array.from(randomBytes(16), (b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"[b % 55]).join("");
const isBlank = (v) => !v || /^change-me/i.test(v);

const GENERATE = {
  ADMIN_PASSWORD: password,
  SESSION_SECRET: () => hex(32),
  CRON_SECRET: () => hex(24),
  BRIDGE_TOKEN: () => hex(24),
};

const parse = (text) => Object.fromEntries(text.split("\n").map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, "")]));

if (!existsSync(EXAMPLE)) {
  console.error(`Run this from the project folder (${EXAMPLE} not found).`);
  process.exit(1);
}
const example = readFileSync(EXAMPLE, "utf8");
let text = existsSync(FILE) ? readFileSync(FILE, "utf8") : "";
const created = !text;
if (created && !check) text = example;
let values = parse(text);

// Too-short or reused secrets are as good as no secret.
const MIN = { ADMIN_PASSWORD: 10, SESSION_SECRET: 24, CRON_SECRET: 24, BRIDGE_TOKEN: 16 };
const weakReason = (key, v) => {
  if (!(key in MIN) || isBlank(v)) return null;
  if (v.length < MIN[key]) return `too short (${v.length} chars, want ${MIN[key]}+)`;
  if (key === "CRON_SECRET" && v === values.SESSION_SECRET) return "same as SESSION_SECRET";
  if (key === "BRIDGE_TOKEN" && (v === values.SESSION_SECRET || v === values.CRON_SECRET)) return "reused from another secret";
  return null;
};

const generated = [];
if (!check) {
  // Add any key that is in .env.example but missing here, keeping its comment.
  const exampleLines = example.split("\n");
  for (let i = 0; i < exampleLines.length; i++) {
    const m = exampleLines[i].match(/^([A-Z0-9_]+)=/);
    if (!m || m[1] in values) continue;
    let start = i;
    while (start > 0 && exampleLines[start - 1].startsWith("#")) start--;
    text = text.replace(/\n*$/, "\n") + "\n" + exampleLines.slice(start, i + 1).join("\n") + "\n";
    values[m[1]] = exampleLines[i].split("=")[1] ?? "";
  }
  for (const [key, make] of Object.entries(GENERATE)) {
    if (!isBlank(values[key]) && !(fixWeak && weakReason(key, values[key]))) continue;
    const v = make();
    generated.push([key, v]);
    text = new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${v}`) : text + `\n${key}=${v}\n`;
    values[key] = v;
  }
  writeFileSync(FILE, text);
}

const url = (re) => (v) => !v || re.test(v) || "does not look right";
const RULES = [
  ["ADMIN_PASSWORD", "required", "Password for /admin (generated for you if empty)"],
  ["SESSION_SECRET", "required", "Signs the admin login cookie (generated)"],
  ["CRON_SECRET", "required", "Protects the automatic-run URL (generated)"],
  ["WHATSAPP_CHANNEL_URL", "recommended", "Your channel link, https://whatsapp.com/channel/XXXX (WhatsApp > Updates > your channel > Share)", url(/^https:\/\/(www\.)?whatsapp\.com\/channel\/[\w-]+/i)],
  ["INSTAGRAM_URL", "optional", "e.g. https://instagram.com/yourhandle (button is hidden if empty)", url(/^https:\/\/(www\.)?instagram\.com\/[\w.]+/i)],
  ["UPSTASH_REDIS_REST_URL", "vercel", "Comes from Vercel: Storage > Upstash Redis. Not needed on your own PC.", url(/^https:\/\//)],
  ["UPSTASH_REDIS_REST_TOKEN", "vercel", "Comes from the same Upstash integration."],
  ["ANTHROPIC_API_KEY", "optional", "Only if you want AI to read messy job pages (paid, from console.anthropic.com)"],
];
const bridge = values.PUBLISH_MODE === "bridge";
if (bridge) RULES.push(["BRIDGE_URL", "required", "Public https address of your WhatsApp bridge", url(/^https:\/\//)], ["BRIDGE_TOKEN", "required", "Shared secret with the bridge (generated)"]);

let missing = 0;
console.log(`\n${check ? "Checking" : created ? "Created" : "Updated"} ${FILE}\n`);
for (const [key, level, hint, valid] of RULES) {
  const v = values[key];
  const set = !isBlank(v);
  const wasGenerated = generated.some(([k]) => k === key);
  const weak = set ? weakReason(key, v) : null;
  const problem = weak ?? (set && valid ? valid(v) : true);
  const bad = set && problem !== true;
  let mark = set ? (bad ? "CHECK  " : wasGenerated ? "MADE   " : "ok     ") : level === "required" ? "MISSING" : level === "recommended" ? "todo   " : "-      ";
  if (!set && level === "required") missing++;
  if (bad) console.log(`  ${mark} ${key}: ${problem}${weak ? "  (run: npm run setup:env -- --fix-weak)" : ""}`);
  else console.log(`  ${mark} ${key}${set ? "" : `  <- ${hint}`}`);
}
const pw = generated.find(([k]) => k === "ADMIN_PASSWORD");
if (pw) console.log(`\nYour admin password (shown once, it is also saved in ${FILE}):\n\n    ${pw[1]}\n`);
console.log("\nLegend: ok = already set, MADE = generated just now, todo = you should set it, - = optional/not needed locally.");
console.log(`\n${FILE} is private and git-ignored. Vercel does NOT read this file: copy the values into`);
console.log("Vercel > Project > Settings > Environment Variables (paste the whole file into the first Key box to import all at once).\n");
process.exit(missing ? 1 : 0);
