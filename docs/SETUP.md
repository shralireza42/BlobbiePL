# Blobbie Playground — Local Setup (0 → Launch)

A complete, part-by-part guide to running the Blobbie Playground on your own
machine, including full **X (Twitter)** and **Telegram** setup tutorials for the
Airdrop Social Tasks.

> You can run the whole app **without any external accounts** in Beta Mock Mode.
> X/Telegram are only needed when you want real social-task verification
> (Parts 6–7).

---

## Table of contents

1. [Part 0 — What you'll end up with](#part-0--what-youll-end-up-with)
2. [Part 1 — Prerequisites](#part-1--prerequisites)
3. [Part 2 — Get the code & install](#part-2--get-the-code--install)
4. [Part 3 — Environment file (`.env`)](#part-3--environment-file-env)
5. [Part 4 — Database (Postgres) + migrate + seed](#part-4--database-postgres--migrate--seed)
6. [Part 5 — Run it on localhost](#part-5--run-it-on-localhost)
7. [Part 6 — X (Twitter) setup tutorial](#part-6--x-twitter-setup-tutorial)
8. [Part 7 — Telegram setup tutorial](#part-7--telegram-setup-tutorial)
9. [Part 8 — Verify the Social Tasks end-to-end](#part-8--verify-the-social-tasks-end-to-end)
10. [Part 9 — Build, lint & test](#part-9--build-lint--test)
11. [Part 10 — Admin access](#part-10--admin-access)
12. [Part 11 — Troubleshooting](#part-11--troubleshooting)
13. [Part 12 — Deploy (quick pointers)](#part-12--deploy-quick-pointers)

---

## Part 0 — What you'll end up with

- The app at **http://localhost:3000**.
- Working **Daily Rewards Draw**, **Airdrop Hub**, **Dashboard** (profile + levels),
  **Global Chat**, **Verify**, and **Admin**.
- In **Beta Mock Mode** (no contracts), purchases are simulated and the round/
  levels run on mock data.
- With a database: airdrop points, profiles, chat, draw entries persist.
- With X/Telegram credentials: real social-task verification (+100 / +75 / +50).

---

## Part 1 — Prerequisites

Install these first:

- **Node.js 20+** (22 recommended). Check: `node -v`
- **npm 10+**. Check: `npm -v`
- **Git**.
- **PostgreSQL** — either **Docker** (easiest, used below) or a local Postgres 14+.
- A browser wallet (**MetaMask** or **Trust Wallet**) for testing wallet login.
- (Optional) A **WalletConnect** project id for WalletConnect support.

---

## Part 2 — Get the code & install

```bash
git clone <your-repo-url> blobbie
cd blobbie
npm install
```

`npm install` also runs `prisma generate` automatically.

---

## Part 3 — Environment file (`.env`)

Copy the example and edit it. The app reads `.env`; the Prisma CLI **only**
reads `.env` (not `.env.local`), so keep `DATABASE_URL` here.

```bash
cp env.example .env
```

Generate strong secrets:

```bash
# JWT session secret
openssl rand -hex 32
# (optional) token encryption key for OAuth tokens at rest
openssl rand -hex 32
```

Minimum to boot in **Beta Mock Mode** (no contracts, no social):

```env
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_ENABLE_MOCK_MODE=true
NEXT_PUBLIC_ENABLE_TICKET_PURCHASE=true
NEXT_PUBLIC_MOCK_BLOBBIE_PRICE_USD=0.0025
NEXT_PUBLIC_SITE_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/blobbie?schema=public
JWT_SECRET=<paste the 32-byte hex here>
ADMIN_WALLET_ADDRESS=<your wallet address, lowercase, optional>
```

Optional but recommended:

```env
# WalletConnect (https://cloud.reown.com → formerly WalletConnect Cloud)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your project id>

# Encrypt OAuth tokens at rest (otherwise derived from JWT_SECRET)
SOCIAL_ENCRYPTION_KEY=<paste a 32-byte hex>
```

> Contract addresses (`NEXT_PUBLIC_BLOBBIE_TOKEN_ADDRESS`,
> `NEXT_PUBLIC_DAILY_DRAW_CONTRACT_ADDRESS`, etc.) can stay empty — the app runs
> in Beta Mock Mode until they're set and `NEXT_PUBLIC_ENABLE_MOCK_MODE=false`.

X/Telegram variables are covered in Parts 6–7.

---

## Part 4 — Database (Postgres) + migrate + seed

### Option A — Docker (recommended)

The repo ships a `docker-compose.yml` with a Postgres service.

```bash
docker compose up -d db
```

This starts Postgres on `localhost:5432` with db `blobbie` (user/pass
`postgres`/`postgres`) — matching the `DATABASE_URL` above.

### Option B — Local Postgres

Create a database and set `DATABASE_URL` accordingly:

```bash
createdb blobbie
# DATABASE_URL=postgresql://<user>:<pass>@localhost:5432/blobbie?schema=public
```

### Run migrations + seed

Use the npm scripts (they load `.env` **and** `.env.local` automatically):

```bash
npm run prisma:migrate -- --name init   # create + apply the schema
npm run db:seed                          # seed airdrop campaign + tasks
```

> No database? You can skip Part 4 entirely — the app still runs in Beta Mock
> Mode using in-memory/localStorage data (points/chat/social won't persist).

---

## Part 5 — Run it on localhost

```bash
npm run dev
```

Open **http://localhost:3000**.

First-run walkthrough:

1. Click **Connect Wallet** (top-right). Choose MetaMask / Trust / WalletConnect.
2. Switch your wallet to **BNB Smart Chain Testnet** (chain id `97`) if prompted.
3. Sign the gas-free message to verify your wallet (creates your session).
4. Explore **Daily Rewards Draw** (buy simulated tickets), **Airdrop Hub**
   (tasks + Social Tasks), **Dashboard** (profile, level, points).

---

## Part 6 — X (Twitter) setup tutorial

Goal: let users connect X via OAuth and verify they follow **@xBlobbie**.

### 6.1 Create a developer account + app

1. Go to **https://developer.x.com** and sign in with the X account that will
   own the app.
2. In the **Developer Portal**, create a **Project**, then an **App** inside it.
   (The Free tier works for basic OAuth + user lookups; note that
   `follows.read` has strict rate limits on lower tiers.)

### 6.2 Configure OAuth 2.0

1. Open your App → **User authentication settings** → **Set up**.
2. **App permissions:** `Read`.
3. **Type of App:** `Web App, Automated App or Bot` (this is a *confidential*
   client and gives you a **Client Secret**).
4. **Callback URI / Redirect URL** (exact):
   ```
   http://localhost:3000/api/social/x/callback
   ```
5. **Website URL:** `http://localhost:3000`
6. Save. X shows your **OAuth 2.0 Client ID** and **Client Secret** — copy both.

### 6.3 Get the App-only Bearer Token

1. App → **Keys and tokens** → **Bearer Token** → Generate. Copy it.
   (Used to resolve `@xBlobbie` → numeric user id when `X_BLOBBIE_USER_ID` is
   empty.)

### 6.4 (Optional) Find the target user id

To avoid a username lookup at runtime, you can hardcode the id:

```bash
curl -s "https://api.x.com/2/users/by/username/xBlobbie" \
  -H "Authorization: Bearer <X_BEARER_TOKEN>"
# → { "data": { "id": "1234567890", "name": "...", "username": "xBlobbie" } }
```

### 6.5 Fill `.env`

```env
ENABLE_X_VERIFICATION=true
X_CLIENT_ID=<oauth2 client id>
X_CLIENT_SECRET=<oauth2 client secret>
X_REDIRECT_URI=http://localhost:3000/api/social/x/callback
X_BEARER_TOKEN=<app bearer token>
X_BLOBBIE_USERNAME=xBlobbie
X_BLOBBIE_USER_ID=<optional numeric id from 6.4>
X_API_BASE_URL=https://api.x.com/2
AIRDROP_X_FOLLOW_POINTS=100
```

The app requests scopes `tweet.read users.read follows.read offline.access`
automatically. Restart `npm run dev` after editing `.env`.

> Tokens are stored **encrypted** (AES-256-GCM) and never sent to the browser.

---

## Part 7 — Telegram setup tutorial

Goal: let users connect Telegram and verify they joined your channel/group.

### 7.1 Create a bot with BotFather

1. In Telegram, open **@BotFather** → send `/newbot`.
2. Give it a **name** and a **username** (must end in `bot`, e.g. `BlobbieBot`).
3. BotFather returns a **token** like `123456:ABC-DEF...` → this is
   `TELEGRAM_BOT_TOKEN`. The username (without `@`) is `TELEGRAM_BOT_USERNAME`.

### 7.2 Allow the Login Widget domain

The Telegram Login Widget needs a **domain** (it does **not** work on bare
`http://localhost`). Two options:

- **Tunnel (recommended for local):** run a tunnel to port 3000, e.g.
  ```bash
  npx localtunnel --port 3000     # or: ngrok http 3000 / cloudflared tunnel
  ```
  You'll get a public URL like `https://blobbie.loca.lt`.
- Then in **@BotFather** → `/setdomain` → choose your bot → send that domain
  (e.g. `blobbie.loca.lt`).
- Set `NEXT_PUBLIC_SITE_URL` and `X_REDIRECT_URI` to that tunnel URL too if you
  test X through the tunnel.

> You can still verify Telegram membership without the widget by testing the
> `getChatMember` flow directly, but the in-app "Connect Telegram" button uses
> the widget, which requires the domain above.

### 7.3 Create the channel/group and add the bot as admin

1. Create your public channel or group (e.g. `@BlobbieOfficial`).
2. Add your bot as an **Administrator** (required so it can read members via
   `getChatMember`).

### 7.4 Get the chat id

- **Public channel/group:** you can use `@yourchannelusername` directly as
  `TELEGRAM_CHAT_ID`.
- **Private group / numeric id:** post any message in the group, then:
  ```bash
  curl -s "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates"
  # find "chat":{"id":-1001234567890, ...} → use that number
  ```
  Supergroup/channel ids look like `-1001234567890`.

### 7.5 Fill `.env`

```env
ENABLE_TELEGRAM_VERIFICATION=true
TELEGRAM_BOT_TOKEN=123456:ABC-your-bot-token
TELEGRAM_BOT_USERNAME=BlobbieBot
TELEGRAM_CHAT_ID=@BlobbieOfficial         # or -1001234567890
TELEGRAM_CHANNEL_URL=https://t.me/BlobbieOfficial
AIRDROP_TELEGRAM_JOIN_POINTS=75
AIRDROP_BONUS_SOCIAL_POINTS=50
```

Restart `npm run dev` after editing `.env`.

---

## Part 8 — Verify the Social Tasks end-to-end

1. Connect + verify your wallet, open **/airdrop** → **Social Tasks**.
2. **Follow X:** click **Connect X** → authorize on X → you're redirected back
   (`/airdrop?x=connected`). Follow **@xBlobbie**, then click **Verify** →
   "X follow verified. Points confirmed." → **+100**.
3. **Join Telegram:** use the **Telegram login** button → join the channel →
   click **Verify** → "Telegram join verified. Points confirmed." → **+75**.
4. Once both are confirmed, the **Social Bonus** auto-confirms → **+50**.
5. Re-clicking **Verify** shows "This task has already been confirmed."
   (idempotent). Points appear on the **Dashboard** and raise your **level**.

If a provider isn't configured or the API is unavailable/rate-limited, the task
shows "temporarily unavailable" and is **never** confirmed.

---

## Part 9 — Build, lint & test

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # next lint
npm test              # pure social-verification unit tests (Node test runner)
npm run build         # prisma generate + next build
npm run start         # run the production build
```

---

## Part 10 — Admin access

Set `ADMIN_WALLET_ADDRESS` (comma-separated, lowercase) in `.env`. Connect with
that wallet and open **/admin** to configure mock mode, review airdrop users,
flag fraud, and export CSV.

---

## Part 11 — Troubleshooting

- **`Environment variable not found: DATABASE_URL` (P1012)** — the Prisma CLI
  only auto-loads `.env`. Use `npm run prisma:migrate -- --name init`
  (loads `.env` and `.env.local`) or put `DATABASE_URL` in `.env`.
- **Telegram widget doesn't appear / "Bot domain invalid"** — set the bot domain
  via `/setdomain` to your public tunnel domain; the widget can't run on bare
  `localhost`.
- **X callback error (`x=error&reason=state`)** — the OAuth state cookie expired
  (10 min) or the callback URL doesn't match exactly. Re-check
  `X_REDIRECT_URI` equals the value in the X App settings.
- **X verify says "temporarily unavailable"** — usually missing/incorrect
  credentials or `follows.read` rate limits on your API tier. Try again later.
- **"Token contract not configured yet"** — expected in Beta Mock Mode; set the
  contract addresses and `NEXT_PUBLIC_ENABLE_MOCK_MODE=false` to go live.
- **Wallet won't connect** — ensure your wallet is on **BNB Testnet (97)** or set
  `NEXT_PUBLIC_CHAIN_ID=56` for mainnet.
- **Points/chat not saving** — you're running without a database; complete Part 4.

---

## Part 12 — Deploy (quick pointers)

- **Vercel:** import the repo, set all env vars, provision Postgres (Vercel
  Postgres / Neon / Supabase), then run `npm run prisma:deploy` once and
  `npm run db:seed`. Update `X_REDIRECT_URI`, `NEXT_PUBLIC_SITE_URL`, and the
  Telegram bot domain to your production domain.
- **Docker:** `docker compose up --build` (web + Postgres; migrations run on
  startup).

See the main [`README.md`](../README.md) for architecture, the mock-vs-real
matrix, and the "must be audited before mainnet" checklist.
