# Blobbie Playground (Beta)

A Web3 reward ecosystem on **BNB Chain** powered by the **$BLOBBIE** BEP-20 token.
The Playground Beta ships two active products — the **Daily Rewards Draw** and the
**Airdrop Hub** — plus a set of polished *Coming Soon* modules, an admin console,
and a clean provider pattern that swaps between **mock** and **real** contracts.

> Language rule: the product is always called the **“Daily Rewards Draw.”** The
> word “lottery” is never used in UI, routes, labels, or copy.

---

## Stack

- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS** (dark cyber-neon design)
- **wagmi + viem** + **WalletConnect** (MetaMask / Trust Wallet / WalletConnect)
- **BNB Chain** (mainnet `56`) + **BNB Testnet** (`97`)
- **Prisma + PostgreSQL** backend
- **Zod** validation on every mutation
- API routes with **rate limiting** for sensitive endpoints
- Provider factory for **mock vs real** contracts

---

## Routes

| Route | Status | Description |
| --- | --- | --- |
| `/` | Active | Cyber-neon landing page |
| `/playground` | Active | Central hub of all modules |
| `/daily-draw` | **Active** | Daily Rewards Draw (main product) |
| `/airdrop` | **Active** | Airdrop Hub (points + tasks) |
| `/dashboard` | Active | Unified user dashboard |
| `/verify` | Active | Look up any round's participants, status & winners |
| `/admin` | Protected | Admin console (wallet-gated) |
| `/playground/dash` `/playground/blast` `/playground/stack` | Coming Soon | Mini-games (shown in the dedicated Games section) |
| `/referrals` `/free-entries` `/staking` `/jackpot` | Coming Soon | Future modules (`free-entries`, `staking`, `jackpot` surface only on `/playground`) |

### Design

Dark brand theme matching itsblobbie.com / the Framer reference:

- Background `#1c1d22`, primary text `#e8edda`, dark button text `#020202`.
- **Dela Gothic One** for bold/heading text, **Bricolage Grotesque** (bold italic) for normal/body text (loaded via `next/font`).
- Pill buttons (cream fill, dark text), logo + Dashboard button on the right of the header.
- The three mini-games render in a dedicated **Games — Coming Soon** section using swappable preview images in [`public/games/`](./public/games) (`dash.svg`, `blast.svg`, `stack.svg`). Replace those files to update the artwork.
- **Logo:** the header/footer logo uses `public/logo.png` if present, otherwise falls back to the bundled `public/logo.svg`. Drop your official `LOGO.png` at `public/logo.png` — no code change required.
- **Levels (0–10):** users level up by earning Airdrop Points; their Blobbie character shows on the dashboard and in the Global Chat. The 10 level characters are editable SVGs in [`public/levels/`](./public/levels) (`level-1.svg` … `level-10.svg`); level 0 uses the default logo. Thresholds/titles live in `src/lib/levels.ts`.
- Header is a cream "sticker" bar (`#f8ffe8`) with black text/icons; buttons are pale‑yellow (`#fcfac2`) / lime (`#e2fea5`) pills with black text, black border and a hard drop shadow. Page background `#1c1d22`, body text `#e8edda`.
- On the home page, **Daily Rewards Draw** and **Airdrop Hub** are full-height sections with transparent panels; only **Blobbie Vault Burst (Jackpot)** is shown as Coming Soon (transparent). The other Coming Soon modules live on the Daily Rewards Draw and Playground pages.

---

## Local development

```bash
# 1. Install dependencies (also runs prisma generate)
npm install

# 2. Configure environment (env.example and .env.example are identical)
cp env.example .env
#   Fill DATABASE_URL, JWT_SECRET, ADMIN_WALLET_ADDRESS, WalletConnect id, etc.
#   Leave contract addresses empty to run in Beta Mock Mode.

# 3. (Optional) Spin up Postgres + run migrations + seed
docker compose up -d db          # or use your own Postgres
npx prisma migrate dev --name init
npm run db:seed

# 4. Run the dev server
npm run dev                      # http://localhost:3000
```

The app **works without a database** — it falls back to deterministic mock data
and clearly labels everything as **Beta Mock Mode**. A database is required only
to persist airdrop points, draw entries, and admin reviews.

---

## Build / test commands

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # next lint
npm run build         # prisma generate + next build
npm run start         # production server (after build)

# Database
npm run prisma:migrate   # create/apply dev migration
npm run prisma:deploy    # apply migrations in prod
npm run prisma:studio    # inspect data
npm run db:seed          # seed airdrop campaign + tasks
```

---

## Environment variables

See [`.env.example`](./.env.example). Summary:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CHAIN_ID` | `56` mainnet / `97` testnet |
| `NEXT_PUBLIC_BLOBBIE_TOKEN_ADDRESS` | $BLOBBIE BEP-20 (empty ⇒ mock) |
| `NEXT_PUBLIC_DAILY_DRAW_CONTRACT_ADDRESS` | DailyRewardsDraw (empty ⇒ mock) |
| `NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS` | Jackpot contract |
| `NEXT_PUBLIC_OPERATIONAL_WALLET_ADDRESS` | Pool supplement wallet |
| `NEXT_PUBLIC_BURN_ADDRESS` | Burn/treasury address |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud id |
| `NEXT_PUBLIC_ENABLE_MOCK_MODE` | Force Beta Mock Mode |
| `NEXT_PUBLIC_ENABLE_TICKET_PURCHASE` | Toggle ticket purchase |
| `NEXT_PUBLIC_MOCK_BLOBBIE_PRICE_USD` | Mock price (1 ticket = $1) |
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_WALLET_ADDRESS` | Comma-separated admin wallet(s) |
| `JWT_SECRET` | Session signing secret |

---

## Deployment

### Vercel

1. Import the repo into Vercel.
2. Add all env vars (Project → Settings → Environment Variables).
3. Provision PostgreSQL (Vercel Postgres, Neon, Supabase…) and set `DATABASE_URL`.
4. Build command: `npm run build` (runs `prisma generate`). Output: default.
5. After the first deploy, apply migrations: `npx prisma migrate deploy`
   (run via a deploy hook, a one-off job, or locally against the prod DB).
6. Seed once: `npm run db:seed`.

### Docker (optional)

```bash
docker compose up --build
# web → http://localhost:3000, postgres on :5432
# migrations run automatically via `prisma migrate deploy` on web startup
```

---

## Mock vs Real

| Area | Mock (default) | Real (when configured) |
| --- | --- | --- |
| Contracts | `MockDrawProvider` (deterministic data) | `RealDrawProvider` (on-chain reads via viem) |
| Price | `NEXT_PUBLIC_MOCK_BLOBBIE_PRICE_USD`, labeled “Mock price” | Oracle read (wire in `src/lib/price.ts`) |
| Buy tickets | **Simulated only** — never claims a real tx | Wallet `writeContract` to `buyTickets` |
| Claim prize | Simulated | Wallet `writeContract` to `claimPrize` |
| Balance | “Token contract not configured yet” | Live BEP-20 `balanceOf` |
| Winners/results | Deterministic mock winners | `getRoundWinners` on-chain + DB index |

The switch lives in `src/lib/contracts/index.ts`. The real provider is selected
**only** when mock mode is disabled **and** the Daily Draw address is set —
otherwise the app stays in Beta Mock Mode and never fakes a transaction.

The required future contract methods are defined in `src/lib/contracts/types.ts`
and `src/lib/contracts/abi.ts`:
`getCurrentRound`, `getRoundInfo`, `getUserTickets`, `buyTickets`, `claimPrize`,
`getRoundWinners`.

---

## Round & prize logic

- **1 ticket = 1 entry.** A round fills at **300 tickets** — it does not matter
  how many unique wallets join (a wallet may hold many tickets/entries).
- **Round closes** when 300 tickets sell **or** after 24h, then winners are drawn
  randomly (VRF-compatible when live) and the next round starts.
- If fewer than 300 real tickets sell, the **operational wallet supplies the
  remaining tickets** so it's always a 300-ticket round. **Supplementary tickets
  are never eligible to win**, and **prizes scale to `realTickets ÷ 300`** (only
  the real revenue is paid out). Winners are drawn only from real tickets.
- **1 Ticket = $1 USD** equivalent in $BLOBBIE — token amount always derived
  from the price source, never hardcoded 1:1.
- **Prize distribution (full 300-ticket round):** 1st = $102, 2nd–10th = $4 each,
  11th–150th = $1 each (winner payout $278). Allocations: Free Daily Entries $10,
  Jackpot $5, Burn/Treasury $7. At lower real ticket counts every amount scales
  down by `realTickets ÷ 300`.
- The Daily Rewards Draw page shows each connected wallet its **win chance**,
  **estimated winnings** and **top prize** at the current scale.

## Airdrop task verification (anti-fake)

Social tasks (Follow on X, Join Telegram) are **never awarded on a click**. They
require verification:

- **Telegram** — when `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` +
  `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` are set, the Telegram Login Widget signs the
  user in and the server verifies the payload **and** group membership
  (`getChatMember`) before awarding.
- **X (Twitter)** — when `X_BEARER_TOKEN` + `X_TARGET_USER_ID` are set the server
  checks the follow via the X API (OAuth follow-check scaffolded).
- When a provider is **not configured**, the task falls back to **admin review**
  (pending) — so points can never be claimed for a fake follow/join.

---

## Security model

- No private keys or secrets in the frontend; all writes go through the connected
  wallet.
- Wallet **signature login** (viem `verifyMessage`) → HMAC-signed httpOnly session.
- Every mutation validated with **Zod**; points/rewards are **server-computed**
  only (never trusted from the client).
- **Rate limiting** on auth, ticket purchase, and task-claim endpoints.
- Points-ledger writes are **transactional**; admin actions are **audit-logged**.
- DB constraints enforce: one entry per (round, user), **one wallet → one prize
  per round**, one-time prize claim, and **no duplicate task claims**
  (unique `taskId + userId + dayBucket`).
- Privacy-preserving **IP/device hashes** for sybil checks.

---

## Must be audited before mainnet

1. **DailyRewardsDraw smart contract** — round lifecycle, supplement logic,
   prize math, and one-wallet-one-prize enforcement on-chain.
2. **VRF integration** — winner selection must use Chainlink VRF (or equivalent)
   for provably fair randomness.
3. **Token approval / transfer flow** — `approve` + `buyTickets` UX and slippage
   on the price source.
4. **Real price oracle** — replace the mock in `src/lib/price.ts` with an
   audited on-chain feed.
5. **Session/auth hardening** — nonce replay protection, cookie flags, and
   admin authn (currently env-wallet gated for the beta).
6. **Rate limiter backing store** — move from in-memory to Redis/DB for
   multi-instance deployments.
7. **Anti-sybil review pipeline** — finalize fraud heuristics before any real
   token allocation.

> Disclaimer: Participation involves risk. This is not financial advice and
> rewards are not guaranteed. Beta features may run in mock mode.
