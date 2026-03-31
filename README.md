# Anna Cards

A Web3 greeting card platform built on Solana. Users burn **$ANN (Anniversary Coin)** tokens to send personalised on-chain greeting cards with a gift-box reveal experience.

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **NextAuth v5** (Google + Email magic link)
- **Prisma 7** + PostgreSQL
- **Solana** — `@solana/web3.js` v1, `@solana/spl-token` v0.4
- **Wallet Adapter** — Phantom / Solflare
- **Framer Motion** — animations + 3D tilt
- **canvas-confetti** — gift reveal
- **Tailwind CSS v4**

---

## Setup

### 1. Prerequisites

- Node.js 22.13+ (use `nvm use 22.13.0`)
- PostgreSQL database
- Google OAuth app credentials
- SMTP server (for email magic links)
- Deployer keypair with mint authority over $ANN

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in all values in `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Public URL of the app |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `EMAIL_SERVER` | SMTP URI |
| `EMAIL_FROM` | From address for magic links |
| `SOLANA_RPC_URL` | Solana RPC endpoint |
| `DEPLOYER_PRIVATE_KEY` | Base58 or JSON-array keypair |

### 3. Database

```bash
# Run migrations (creates tables)
npm run db:migrate

# Or for production (apply migrations without dev prompts)
npx prisma migrate deploy
```

### 4. Audio tracks

Add 4 royalty-free MP3 loops to `public/audio/`:

```
public/audio/track-1.mp3   # Gentle Piano
public/audio/track-2.mp3   # Acoustic Guitar
public/audio/track-3.mp3   # Soft Jazz
public/audio/track-4.mp3   # Upbeat Pop
```

Suggested free source: [Pixabay Music](https://pixabay.com/music/) (CC0 license). Keep each loop under 2MB.

### 5. Run locally

```bash
npm run dev
```

Open http://localhost:3000

---

## User Flows

### Onboarding
1. Landing page → Sign in (Google or email magic link)
2. Dashboard → Connect Solana wallet
3. Claim **2,000 ANN** beta airdrop (once per wallet)

### Card Creation (`/create`)
1. Choose tier (100 / 500 / 1000 ANN burned)
2. Fill in card content (message, background, photo for Tier 2, music, emojis)
3. Sign and submit burn transaction via wallet
4. Backend verifies the burn on-chain, saves card to DB
5. Share the unique `/card/[slug]` link

### Card Viewing (`/card/[slug]`)
- Public — no login required
- Gift box animation → click → confetti + card reveal
- Tier 2: 3D parallax tilt, background music, Solana Explorer badge

---

## Deploy (VPS)

```bash
# 1. Clone & install (Node 22.13+)
npm ci

# 2. Set .env with production values

# 3. Apply DB migrations
npx prisma migrate deploy

# 4. Build
npm run build

# 5. Start
npm start
```

For PM2:
```bash
pm2 start "npm start" --name ann-cards
pm2 save
```

Ensure `/public/uploads` is writable by the process user.

---

## API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth handlers |
| `/api/wallet/connect` | POST | User | Save wallet address |
| `/api/airdrop/claim` | POST | User | Mint 2,000 ANN airdrop |
| `/api/cards/create` | POST | User | Verify burn + save card |
| `/api/cards/[slug]/open` | PATCH | — | Mark card as opened |

---

## TODO

- **Tier 3 — Compressed NFT minting** (future): use Metaplex Bubblegum to mint a cNFT representing the card on-chain
- **Fiat gateway**: integrate Stripe or MoonPay so users can buy ANN directly from the UI
- **Email notifications**: notify recipient when card is created
- **Card expiry / gifting flow**: allow sending directly to a wallet address
- **Analytics dashboard**: creator stats, burn totals
