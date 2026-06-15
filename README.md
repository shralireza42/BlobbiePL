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
| `/admin` | Protected | Admin console (wallet-gated) |
| `/playground/dash` `/playground/blast` `/playground/stack` | Coming Soon | Mini-games |
| `/referrals` `/free-entries` `/staking` `/jackpot` `/nfts` | Coming Soon | Future modules |

---

## Local development

```bash
# 1. Install dependencies (also runs prisma generate)
npm install

# 2. Configure environment
cp .env.example .env
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

- **Round closes** when 300 unique users join within 24h, **or** after 24h.
- If fewer than 300 join, the **operational wallet supplements** the pool to a
  300-ticket equivalent. **Supplementary tickets are never eligible to win.**
- **1 Ticket = $1 USD** equivalent in $BLOBBIE — token amount always derived
  from the price source, never hardcoded 1:1.
- **Prize distribution:** 1st = $102, 2nd–10th = $4 each, 11th–150th = $1 each
  (total winner payout $278). Allocations: Free Daily Entries $10, Jackpot $5,
  Burn/Treasury $7.

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
