// FOSLA WhatsApp bridge: keeps one WhatsApp Web session alive and posts to your Channel on request.
//
// Env:
//   BRIDGE_TOKEN     (required) shared secret; the Vercel app sends it as "Authorization: Bearer ..."
//   CHANNEL_JID      your channel id, like 120363xxxxxxxxxxxx@newsletter
//   CHANNEL_INVITE   ...or the code at the end of your channel link (https://whatsapp.com/channel/<CODE>);
//                    the bridge looks the id up for you and prints it
//   PORT             default 8787
//   AUTH_DIR         default ./auth   (WhatsApp login; keep it private and backed up)
import { createServer } from "node:http";
import { timingSafeEqual, createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";
import qrcode from "qrcode-terminal";

const PORT = Number(process.env.PORT || 8787);
const TOKEN = process.env.BRIDGE_TOKEN || "";
const AUTH_DIR = process.env.AUTH_DIR || "./auth";
const SENT_FILE = process.env.SENT_FILE || "./sent.json";
let channelJid = process.env.CHANNEL_JID || "";
const invite = process.env.CHANNEL_INVITE || "";

if (TOKEN.length < 16) {
  console.error("Set BRIDGE_TOKEN to a random string of at least 16 characters.");
  process.exit(1);
}

const sent = new Set(existsSync(SENT_FILE) ? JSON.parse(readFileSync(SENT_FILE, "utf8")) : []);
const saveSent = () => writeFileSync(SENT_FILE, JSON.stringify([...sent].slice(-500)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const digest = (s) => createHash("sha256").update(s).digest();
const authorised = (req) => timingSafeEqual(digest(req.headers.authorization || ""), digest(`Bearer ${TOKEN}`));

let sock;
let ready = false;

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({ version, auth: state, browser: Browsers.ubuntu("FOSLA Bridge"), logger: pino({ level: "warn" }), markOnlineOnConnect: false });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\nScan this with WhatsApp > Settings > Linked devices > Link a device:\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      ready = true;
      console.log("WhatsApp connected.");
      if (!channelJid && invite) {
        try {
          const meta = await sock.newsletterMetadata("invite", invite);
          channelJid = meta?.id || "";
          console.log(channelJid ? `Channel found: ${meta.name} -> ${channelJid}\nSet CHANNEL_JID=${channelJid} to skip this lookup next time.` : "Could not resolve CHANNEL_INVITE.");
        } catch (err) {
          console.error("Channel lookup failed:", err?.message || err);
        }
      }
    }
    if (connection === "close") {
      ready = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.error("Logged out from WhatsApp. Delete the auth folder and restart to scan the QR code again.");
      } else {
        console.log(`Connection closed (${code}). Reconnecting...`);
        setTimeout(connect, 3000);
      }
    }
  });
}

const readBody = (req, limit = 15 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("payload too large"), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, connected: ready, channelConfigured: !!channelJid });
    if (!authorised(req)) return json(res, 401, { error: "unauthorized" });

    if (req.method === "POST" && url.pathname === "/post") {
      if (!ready) return json(res, 503, { error: "WhatsApp is not connected yet" });
      if (!channelJid) return json(res, 503, { error: "CHANNEL_JID / CHANNEL_INVITE is not set" });
      const { id, caption, text, imageBase64 } = JSON.parse(await readBody(req));
      if (!id || !imageBase64 || typeof caption !== "string") return json(res, 400, { error: "id, caption and imageBase64 are required" });
      // The app retries on timeouts; never post the same job twice.
      if (sent.has(id)) return json(res, 200, { ok: true, duplicate: true });

      await sock.sendMessage(channelJid, { image: Buffer.from(imageBase64, "base64"), caption });
      if (text) {
        await sleep(1500);
        await sock.sendMessage(channelJid, { text });
      }
      sent.add(id);
      saveSent();
      return json(res, 200, { ok: true });
    }

    return json(res, 404, { error: "not found" });
  } catch (err) {
    console.error("Request failed:", err?.message || err);
    json(res, err?.status || 500, { error: String(err?.message || err) });
  }
}).listen(PORT, () => console.log(`Bridge listening on :${PORT}`));

connect();
