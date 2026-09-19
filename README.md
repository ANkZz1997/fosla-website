# FOSLA Jobs Auto-Post

Checks government-job websites, prepares a branded poster and a full WhatsApp message for each new job
(seat-wise, with dates, fees, age and links), and helps you post it to your WhatsApp Channel.

```
HimExam · FreeJobAlert · SarkariResult · RojgarResult
        │  every 30 min (GitHub Actions) or daily (Vercel Cron)
        ▼
  read listings → skip expired / already-seen / same job on another site
        │
        ▼
  open each job page → post-wise seats, dates, age, fees, qualification, official links
        │            (optional: Claude reads pages whose tables are messy)
        ▼
  poster PNG (FOSLA red/black)  +  short caption  +  full details message
        │
        ├─ Review mode   → /admin dashboard: copy, download poster, "Mark as posted"
        └─ Bridge mode   → your WhatsApp bridge posts to the Channel (one click or automatic)
```

## The public landing page

`/` is a public landing page for the cafe: animated hero, a "Join our WhatsApp Channel" button, Instagram,
an admin-login button, the latest posts you have published, all services, quick links to IGNOU/HPU/NSP/eDistrict,
a document checklist, and your address, hours and an "open now" badge.

- Set `WHATSAPP_CHANNEL_URL` and `INSTAGRAM_URL` in Vercel to make the buttons point at your channel and page.
  Until the channel URL is set, "Join" opens a WhatsApp chat with you instead, and the Instagram button is hidden.
- The feed shows **only jobs you have marked or sent as posted**. Drafts waiting for review never appear publicly,
  and their poster images return 404 to anyone who isn't logged in as admin.
- Until you have posted something, the page shows one clearly labelled **sample post**.
- The admin dashboard is at `/admin` (the landing page links to it).

## What is and isn't possible with WhatsApp Channels

WhatsApp has **no official API to post to a Channel**, and the WhatsApp Business API only messages individual
customers who opted in. So there are two honest options, and the app supports both:

| Mode | How it works | Risk |
|---|---|---|
| **Review (default)** | The app prepares everything. In `/admin` you tap *Copy caption*, *Download poster*, open your channel and paste. About 20 seconds per post. | None |
| **Bridge** | A small service you host ([bridge/](bridge/README.md)) uses the unofficial Baileys library to post for you, one click or fully automatic. | WhatsApp's terms forbid unofficial clients; the linked number can be restricted. Use a number you can afford to lose. |

Start with Review mode. Switch to Bridge once you trust the output.

## Deploy on Vercel

> Step-by-step with checks: see **[GO_LIVE.md](GO_LIVE.md)**. To prepare your `.env`, run `npm run setup:env`.

1. Push this folder to GitHub and import it in Vercel.
2. **Storage → add "Upstash Redis"** (free). This is how the app remembers what it already prepared. It sets
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` for you. **Do not skip this**: without it the same jobs
   would come back on every run, and automatic posting refuses to run.
3. Add environment variables (see [.env.example](.env.example)):
   - `ADMIN_PASSWORD`, `SESSION_SECRET` (long random string), `CRON_SECRET` (long random string)
   - `WHATSAPP_CHANNEL_URL` (your channel link: the landing page's Join button and the dashboard's "Open channel" button)
   - `INSTAGRAM_URL` (optional; e.g. `https://instagram.com/yourhandle`)
4. Deploy. Visitors see `https://<your-app>.vercel.app/`; you log in at `/admin` and press **Fetch new jobs now**.

### Running it automatically

- `vercel.json` runs a check **once a day** (08:00 IST). That is the most the free Vercel plan allows.
- For **every 30 minutes**, for free: in your GitHub repo add secret `CRON_SECRET` and variable `APP_URL`;
  [.github/workflows/poll.yml](.github/workflows/poll.yml) does the rest. (Or use cron-job.org, or Vercel Pro.)

### Optional: AI cleanup

Set `ANTHROPIC_API_KEY`. When a job page's tables don't give post-wise seats or dates, Claude reads the page and
fills them in (only from what the page says; unknown fields stay empty). Default model `claude-opus-5`; change
with `AI_MODEL`. It only runs on the minority of pages that need it.

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `PUBLISH_MODE` | `manual` | `manual` = review in dashboard, `bridge` = send through your bridge |
| `AUTO_POST` | `false` | With `bridge`: post new jobs without review |
| `MAX_NEW_PER_RUN` | `6` | New posts prepared per check (keeps the channel from being flooded) |
| `JOB_SCOPE` | `all` | `only_hp` = only Himachal Pradesh notifications |

The first run prepares `MAX_NEW_PER_RUN` posts, most relevant first (Himachal jobs, then other jobs, admissions,
admit cards, results); later runs continue through the backlog.

## What each post contains

- **Poster** (1080×1350): FOSLA branding, category badge, title, organization, total posts / last date / apply mode,
  the post-wise seat table (or big category-wise seat chips for a single post), your number and address.
- **Short caption** under the poster (well under WhatsApp's image-caption limit).
- **Full message** right after: organization, total posts, dates, pay, **post-wise seats with UR/SC/ST/OBC/EWS
  split**, qualification, age limit, fee, official apply/notification links, a document checklist, and your
  contact details with a `wa.me` link so people can message you to get the form filled.

Results, admit cards and admissions/scholarships get their own layout ("how we can help") instead of a seat table.

## The sources

| Site | How it is read | Notes |
|---|---|---|
| HimExam | Job cards on the HP jobs page | All Himachal |
| FreeJobAlert | Its HP jobs table + RSS feed | HP table gives vacancies, qualification, last date |
| SarkariResult | RSS + homepage links | |
| RojgarResult | RSS + homepage links | **It answered my test requests with HTTP 429 (bot protection).** It may work from Vercel's network, may not. If it is blocked the dashboard shows it and the other sites keep working. |
| HPRCA / HPPSC | **Not scraped** | HPRCA is a JavaScript app whose data API rejects anonymous requests, and HPPSC's login page didn't respond to my test requests. Posts about HPPSC/HPRCA jobs still arrive through the aggregator sites, with the official links. |

If a site redesigns and extraction quietly gets worse, run `npm run audit:live`. It reads ~30 live job pages and
flags the ones the extractor no longer understands.

## Local development

```bash
npm install
cp .env.example .env.local   # set ADMIN_PASSWORD, SESSION_SECRET, CRON_SECRET
npm run dev                  # http://localhost:3000/admin
npm test                     # parser tests on saved copies of the real pages
npm run typecheck
```

Locally, state is kept in `.data/store.json` (no Redis needed).

## Good to know

- Posts are prepared from third-party sites. Always glance at the deadline and the official notification before
  posting; the dashboard shows a warning on posts where the job page could not be read.
- Fonts (Liberation Sans, SIL OFL) are bundled in `src/assets/fonts/` for the posters.
- Add your logo by placing it in the header block of [src/lib/format/poster.tsx](src/lib/format/poster.tsx). The
  poster currently uses the text logo because `fosla-logo-banner.jpg` (referenced in your website file) wasn't in the folder.
