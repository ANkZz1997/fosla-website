# Go live checklist (Vercel)

Do these in order. Each step says how to know it worked.

## 0. How WhatsApp gets connected (read once)

| | Review mode (start here) | Bridge mode (later, optional) |
|---|---|---|
| WhatsApp connection | **None.** You post from your own WhatsApp app. | Your WhatsApp is linked (like WhatsApp Web) to a small program you run, the *bridge*. |
| What you do per post | Tap Copy / Download in `/admin`, paste into your channel. About 20 seconds. | One tap in `/admin`, or fully automatic. |
| Risk | None | WhatsApp doesn't allow unofficial clients; the linked number can be restricted. |

Vercel cannot hold a WhatsApp connection (functions live for seconds), which is why bridge mode needs a separate
always-on machine. Start with Review mode; it needs nothing but your channel link.

## 1. Prepare `.env` on your PC

```bash
npm run setup:env -- --fix-weak
```

This generates the admin password and secrets, fills in missing keys, and prints your **admin password once**.
Save it in a password manager. Then open `.env` and fill in the two things only you have:

| Key | Where to get it |
|---|---|
| `WHATSAPP_CHANNEL_URL` | WhatsApp on your phone > **Updates** > your channel > tap its name > **Share / Copy link**. Looks like `https://whatsapp.com/channel/0029Va...`. No channel yet? Updates > Channels > **+** > Create channel. |
| `INSTAGRAM_URL` | `https://instagram.com/<your handle>` |

Check any time (changes nothing): `npm run setup:env -- --check`

`.env` is private and git-ignored. **Never put real values in `.env.example`**: that file is uploaded to GitHub.

## 2. Put the project on GitHub

```bash
git init
git add .
git status          # make sure ".env" is NOT in this list (".env.example" is fine)
git commit -m "FOSLA jobs auto-post"
```

Create a **private** repository on github.com, then run the two commands it shows (`git remote add origin ...`,
`git push -u origin main`).

## 3. Create the Vercel project

1. vercel.com > **Add New > Project** > import the repository. Framework is detected as Next.js.
2. Under **Environment Variables**, click the first *Key* box and **paste the whole contents of your `.env`**.
   Vercel splits them into separate variables. Delete the empty `UPSTASH_...` lines (step 4 adds them).
3. Click **Deploy**.

## 4. Add storage (required)

Project > **Storage** > **Create / Connect Database** > **Upstash** > **Redis** > free plan > connect it to this project.
Vercel adds the connection variables itself (named `KV_REST_API_URL` / `KV_REST_API_TOKEN` or
`UPSTASH_REDIS_REST_...`; the app accepts either). Then **Deployments > ... > Redeploy**.

Why it matters: this is how the app remembers what it already prepared. Without it, the dashboard shows a red
warning and automatic posting refuses to run.

## 5. Check it works

1. Open `https://<your-project>.vercel.app/`: the landing page. Join/Instagram buttons should open your channel and page.
2. Click **Admin login**, sign in, and confirm the top status card says **Memory of posted jobs: Saved ✓**.
3. Press **Fetch new jobs now**. In under a minute you should see posters appear.

## 6. Start posting (Review mode)

For each poster in `/admin`:

1. Tap **Download poster** (saves the PNG).
2. Open your channel in WhatsApp > attach the poster > paste **Copy caption** as its caption > send.
3. Send **Copy details** as a second message (full seat-wise text).
4. Back in `/admin` tap **Mark as posted**. It now appears on your public landing page.

Skip anything you don't want. Nothing goes to the channel unless you send it.

## 7. Make it check automatically

- The included `vercel.json` runs once a day (08:00 IST): the most Vercel's free plan allows.
- For every 30 minutes (free): GitHub repo > **Settings > Secrets and variables > Actions**
  - **Secrets** tab > New: `CRON_SECRET` = the same value as in Vercel
  - **Variables** tab > New: `APP_URL` = `https://<your-project>.vercel.app` (no trailing slash)
  - Then **Actions** tab > "Check for new jobs" > **Run workflow** to test it (should show a green tick).

## 8. Optional: one-tap or automatic posting with the bridge

Only after Review mode feels right. Follow [bridge/README.md](bridge/README.md): run the bridge on an always-on PC/VPS,
scan its QR code with the WhatsApp account that **owns or administers the channel**, expose it over HTTPS, then in Vercel set
`PUBLISH_MODE=bridge`, `BRIDGE_URL`, `BRIDGE_TOKEN` (same as the bridge) and redeploy. A **Post to channel** button then
appears on each post. Keep `AUTO_POST=false` until you have posted a few this way; only then consider `true`.

## Changing settings later

Vercel does not read your local `.env`. Change values in Vercel > Settings > Environment Variables, then **Redeploy**.

## Security

- Use the generated admin password (10+ characters). Don't reuse a password from anywhere else.
- If a password or secret was ever pasted somewhere public, rerun `npm run setup:env -- --fix-weak` (or delete that line and
  rerun `npm run setup:env`) and update Vercel.
