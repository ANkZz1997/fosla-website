# WhatsApp bridge

The Vercel app prepares each post (poster image + text). This small service is what actually sends it to your
WhatsApp Channel. It has to run somewhere that stays on (a spare PC, a Raspberry Pi, a cheap VPS) because
WhatsApp needs a live connection, and Vercel functions only run for seconds.

> **Read this first.** WhatsApp has no official API for posting to Channels. This bridge uses the unofficial
> Baileys library (the same protocol as WhatsApp Web). It works, but WhatsApp's terms do not allow unofficial
> clients, so there is a real chance the linked number gets restricted. Use a number you can afford to risk
> (not your only business number), post at a human pace, and start with review mode (`AUTO_POST=false`).
> If you'd rather not take that risk, skip this folder: the dashboard's copy/paste mode needs no bridge.

## Setup

1. Install Node 20+, then in this folder: `npm install`
2. Pick a long random token, e.g. `openssl rand -hex 24`.
3. Start it with your channel's invite code (the last part of `https://whatsapp.com/channel/<CODE>`):

   ```bash
   BRIDGE_TOKEN=<your-token> CHANNEL_INVITE=<CODE> npm start
   ```

4. A QR code appears. On the phone: WhatsApp > Settings > Linked devices > Link a device > scan it.
   The number you link must be an **admin/owner of the channel**.
5. The console prints `Channel found: ... -> 120363...@newsletter`. From then on run with
   `CHANNEL_JID=120363...@newsletter` instead of `CHANNEL_INVITE`.
6. Keep it running (`pm2 start server.mjs --name fosla-bridge`, or a systemd service).
7. Make it reachable from Vercel over HTTPS. Easiest: a free Cloudflare Tunnel
   (`cloudflared tunnel --url http://localhost:8787`) or a VPS with Caddy/nginx in front.
8. In Vercel set `PUBLISH_MODE=bridge`, `BRIDGE_URL=https://your-bridge-url`, `BRIDGE_TOKEN=<your-token>`.

## Endpoints

| Route | Auth | What it does |
|---|---|---|
| `GET /health` | none | `{connected, channelConfigured}` |
| `POST /post` | Bearer token | Sends the poster with a short caption, then the full details as a text message |

The bridge remembers the ids it already sent (`sent.json`), so a retry from the app never double-posts.
The `auth/` folder is your WhatsApp login. Keep it private and never commit it.
