# Blobbie Playground — Deploy Online (Step by Step)

A complete walkthrough to take the project live on the internet. The primary
path is **Vercel + a managed Postgres** (fastest). An alternative **Docker / VPS**
path is in [Part 11](#part-11--alternative-docker-on-a-vps).

> Do Part 5 (env vars) carefully — most deploy issues are missing/incorrect env.
> If you only want to run locally, see [`docs/SETUP.md`](./SETUP.md) instead.

---

## Table of contents

1. [Part 0 — What "online" means here](#part-0--what-online-means-here)
2. [Part 1 — Prerequisites & accounts](#part-1--prerequisites--accounts)
3. [Part 2 — Push your code to GitHub](#part-2--push-your-code-to-github)
4. [Part 3 — Provision a production database](#part-3--provision-a-production-database)
5. [Part 4 — Import the project into Vercel](#part-4--import-the-project-into-vercel)
6. [Part 5 — Set production environment variables](#part-5--set-production-environment-variables)
7. [Part 6 — First deploy + run migrations & seed](#part-6--first-deploy--run-migrations--seed)
8. [Part 7 — Custom domain & site URL](#part-7--custom-domain--site-url)
9. [Part 8 — X (Twitter) for production](#part-8--x-twitter-for-production)
10. [Part 9 — Telegram for production](#part-9--telegram-for-production)
11. [Part 10 — Go live with real contracts (optional)](#part-10--go-live-with-real-contracts-optional)
12. [Part 11 — Alternative: Docker on a VPS](#part-11--alternative-docker-on-a-vps)
13. [Part 12 — Redeploys & migrations](#part-12--redeploys--migrations)
14. [Part 13 — Post-deploy checklist](#part-13--post-deploy-checklist)
15. [Part 14 — Production troubleshooting](#part-14--production-troubleshooting)

---

## Part 0 — What "online" means here

- A public URL (e.g. `https://blobbie.xyz`) serving the Next.js app.
- A managed **PostgreSQL** so points, profiles, chat, draw entries, and social
  tasks persist.
- Production **secrets** (JWT, token encryption) and, optionally, **X/Telegram**
  credentials for real social verification and **contract addresses** for real
  on-chain mode.

---

## Part 1 — Prerequisites & accounts

Create accounts (free tiers are fine to start):

- **GitHub** — host the repo.
- **Vercel** — https://vercel.com (hosting).
- **Postgres provider** — **Neon** (https://neon.tech), **Vercel Postgres**, or
  **Supabase** (https://supabase.com).
- **Reown / WalletConnect Cloud** — https://cloud.reown.com (wallet support).
- (Optional) **X Developer** — https://developer.x.com (Follow task).
- (Optional) **Telegram** — a bot via **@BotFather** (Join task).

Local tools (to run migrations): **Node 20+**, **git**, this repo cloned.

---

## Part 2 — Push your code to GitHub

```bash
git remote -v                      # confirm your origin
git push origin <your-branch>
```

Make sure `.env` is **not** committed (it's git-ignored). Only `env.example`
should be in the repo.

---

## Part 3 — Provision a production database

Using **Neon** (example):

1. Create a project → it gives you a connection string like:
   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/blobbie?sslmode=require
   ```
2. Neon offers a **pooled** host (`...-pooler...`) and a **direct** host. For a
   serverless app (Vercel) use the **pooled** string for the app, and the
   **direct** string for running migrations.
3. Keep both strings handy:
   - `DATABASE_URL` (app, pooled) — add `&pgbouncer=true&connection_limit=1` if
     your provider recommends it.
   - `DIRECT_DATABASE_URL` (migrations, direct) — used only from your machine.

> Vercel Postgres / Supabase work the same way; just copy their connection
> string into `DATABASE_URL`.

---

## Part 4 — Import the project into Vercel

1. Vercel → **Add New… → Project** → import your GitHub repo.
2. **Framework Preset:** Next.js (auto-detected).
3. **Build Command:** leave default — the repo's `build` script runs
   `prisma generate && next build`.
4. **Install Command:** default (`npm install`).
5. **Root Directory:** repo root.
6. Don't deploy yet — first add env vars (Part 5). If it auto-deploys and fails,
   that's fine; you'll redeploy after adding env.

---

## Part 5 — Set production environment variables

In Vercel → **Project → Settings → Environment Variables**, add the following for
the **Production** (and **Preview**, if you want) environment. Generate secrets
with `openssl rand -hex 32`.

**Core**
```
NEXT_PUBLIC_CHAIN_ID=56                # 56 mainnet, 97 testnet
NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN
NEXT_PUBLIC_ENABLE_MOCK_MODE=true      # keep true until contracts are ready
NEXT_PUBLIC_ENABLE_TICKET_PURCHASE=true
NEXT_PUBLIC_MOCK_BLOBBIE_PRICE_USD=0.0025
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<reown project id>

DATABASE_URL=<pooled postgres connection string>
JWT_SECRET=<32-byte hex — keep stable>
SOCIAL_ENCRYPTION_KEY=<32-byte hex — keep stable>
ADMIN_WALLET_ADDRESS=<your admin wallet(s), lowercase, comma-separated>
```

**Contracts (optional — only when going live, Part 10)**
```
NEXT_PUBLIC_BLOBBIE_TOKEN_ADDRESS=
NEXT_PUBLIC_DAILY_DRAW_CONTRACT_ADDRESS=
NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS=
NEXT_PUBLIC_OPERATIONAL_WALLET_ADDRESS=
NEXT_PUBLIC_BURN_ADDRESS=
```

**Social tasks (optional — Parts 8 & 9)**
```
ENABLE_X_VERIFICATION=true
X_CLIENT_ID=
X_CLIENT_SECRET=
X_REDIRECT_URI=https://YOUR_DOMAIN/api/social/x/callback
X_BEARER_TOKEN=
X_BLOBBIE_USERNAME=xBlobbie
X_BLOBBIE_USER_ID=
X_API_BASE_URL=https://api.x.com/2

ENABLE_TELEGRAM_VERIFICATION=true
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_CHAT_ID=
TELEGRAM_CHANNEL_URL=

AIRDROP_X_FOLLOW_POINTS=100
AIRDROP_TELEGRAM_JOIN_POINTS=75
AIRDROP_BONUS_SOCIAL_POINTS=50
```

> ⚠️ Keep `JWT_SECRET` and `SOCIAL_ENCRYPTION_KEY` **stable** across deploys. If
> they change, existing sessions log out and stored OAuth tokens can't be
> decrypted. The full reference list is in [`env.example`](../env.example).

---

## Part 6 — First deploy + run migrations & seed

1. In Vercel, trigger a deploy (**Deployments → Redeploy**, or push a commit).
   The build runs `prisma generate && next build`.
2. Apply the database schema **once** from your machine using the **direct**
   connection string (migrations should not run in serverless build):
   ```bash
   # from the repo root, using the production DIRECT url
   DATABASE_URL="<DIRECT_DATABASE_URL>" npx prisma migrate deploy
   DATABASE_URL="<DIRECT_DATABASE_URL>" npm run db:seed
   ```
   (Or temporarily put the direct URL in your local `.env` and run
   `npm run prisma:deploy` then `npm run db:seed`.)
3. Open your Vercel URL — the app should load and persist data.

---

## Part 7 — Custom domain & site URL

1. Vercel → **Project → Settings → Domains** → add your domain and follow the DNS
   steps (Vercel issues HTTPS automatically).
2. Set `NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN` (Part 5) and redeploy so OAuth
   redirects and metadata use the real URL.

---

## Part 8 — X (Twitter) for production

Same as the local tutorial in [`docs/SETUP.md`](./SETUP.md#part-6--x-twitter-setup-tutorial),
with production URLs:

1. X Developer Portal → your App → **User authentication settings**.
2. **Callback URI / Redirect URL** → add (exact):
   ```
   https://YOUR_DOMAIN/api/social/x/callback
   ```
3. **Website URL** → `https://YOUR_DOMAIN`.
4. Set `X_REDIRECT_URI=https://YOUR_DOMAIN/api/social/x/callback` in Vercel and
   redeploy.
5. Mind your X API tier limits — `follows.read` is rate-limited on lower tiers.

---

## Part 9 — Telegram for production

1. **@BotFather → `/setdomain`** → select your bot → set it to **YOUR_DOMAIN**
   (the Telegram Login Widget only works on an allow-listed HTTPS domain).
2. Ensure the bot is an **Administrator** of your channel/group.
3. Confirm `TELEGRAM_CHAT_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
   and `TELEGRAM_CHANNEL_URL` are set in Vercel, then redeploy.

---

## Part 10 — Go live with real contracts (optional)

Until your audited contracts are deployed, keep `NEXT_PUBLIC_ENABLE_MOCK_MODE=true`.
When ready:

1. Deploy/verify the **$BLOBBIE** BEP-20 token and the **DailyRewardsDraw**
   contract (must expose `getCurrentRound`, `getRoundInfo`, `getUserTickets`,
   `buyTickets`, `claimPrize`, `getRoundWinners` and use VRF-compatible
   randomness).
2. Set the `NEXT_PUBLIC_*_ADDRESS` vars (Part 5) and
   `NEXT_PUBLIC_ENABLE_MOCK_MODE=false`.
3. Replace the mock price in `src/lib/price.ts` with a real oracle read.
4. Redeploy. The provider factory switches to the real on-chain provider.

> See the "Must be audited before mainnet" checklist in the main
> [`README.md`](../README.md) before handling real funds.

---

## Part 11 — Alternative: Docker on a VPS

On any VPS with Docker:

```bash
git clone <your-repo-url> blobbie && cd blobbie
cp env.example .env            # fill DATABASE_URL, JWT_SECRET, etc.
docker compose up --build -d   # builds web + Postgres; migrations run on start
```

- The bundled `docker-compose.yml` runs `prisma migrate deploy` on the web
  container's startup and serves on port **3000**.
- Put a reverse proxy in front for HTTPS (e.g. **Caddy** or **Nginx + certbot**)
  and point it at `localhost:3000`.
- Set `NEXT_PUBLIC_SITE_URL`, `X_REDIRECT_URI`, and the Telegram bot domain to
  your real HTTPS domain.
- Seed once: `docker compose exec web npm run db:seed`.

---

## Part 12 — Redeploys & migrations

- **Code changes:** push to your branch → Vercel auto-builds and deploys.
- **Schema changes:** create a migration locally
  (`npm run prisma:migrate -- --name your_change`), commit it, then apply to prod
  with `DATABASE_URL="<DIRECT_URL>" npx prisma migrate deploy`. Never edit prod
  tables by hand.
- **Env changes:** update in Vercel → redeploy to take effect.

---

## Part 13 — Post-deploy checklist

- [ ] App loads at your domain over HTTPS.
- [ ] Connect Wallet works (correct chain id) and signing logs you in.
- [ ] `/api/draw/current` returns a round (open the Daily Rewards Draw page).
- [ ] Buying a (mock) ticket updates the tickets/participants count.
- [ ] `/api/social/status` reflects your X/Telegram config.
- [ ] X connect → callback → follow verify grants +100; Telegram +75; bonus +50.
- [ ] Points show on the Dashboard and raise your level.
- [ ] `/admin` is reachable only by `ADMIN_WALLET_ADDRESS`.
- [ ] `robots.txt` disallows `/admin` (already shipped).

---

## Part 14 — Production troubleshooting

- **DB connection errors / "too many connections"** — use the **pooled**
  `DATABASE_URL` (add `?pgbouncer=true&connection_limit=1` on Neon). Run
  migrations with the **direct** URL.
- **Migrations didn't apply** — run `npx prisma migrate deploy` against the prod
  DB (Part 6). Builds don't migrate automatically.
- **X callback `redirect_uri` mismatch** — `X_REDIRECT_URI` must match the X App
  setting **exactly**, including `https` and no trailing slash.
- **Telegram widget missing in prod** — set the bot domain to your real domain
  via `/setdomain`; it won't render on an unverified domain.
- **Everyone logged out after a deploy** — `JWT_SECRET` changed; keep it stable.
- **Social tokens can't decrypt** — `SOCIAL_ENCRYPTION_KEY` (or `JWT_SECRET`)
  changed; keep it stable or users must reconnect.
- **Rate limiting resets / inconsistent across instances** — the limiter is
  in-memory per instance; for multi-instance scale, back it with Redis (swap the
  store in `src/lib/rate-limit.ts`).
- **Chat messages vanish** — without a database the chat uses an in-memory
  buffer per instance; ensure `DATABASE_URL` is set and migrated.

---

Need the local version first? See [`docs/SETUP.md`](./SETUP.md). For architecture
and the mock-vs-real matrix, see the main [`README.md`](../README.md).
