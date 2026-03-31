---
name: Anna Cards project
description: Full-stack Web3 greeting card platform built on Solana — project structure and key decisions
type: project
---

Full Next.js 16 + Prisma 7 + NextAuth v5 project scaffolded at `/Users/ivanus/Documents/Development/vj/anniversary-coin-greeting-card`.

**Why:** MVP for sending on-chain greeting cards by burning $ANN tokens on Solana mainnet.

**How to apply:** Before suggesting changes, check existing file structure and Prisma 7 patterns used here (driver adapter approach, no URL in schema.prisma).

Key facts:
- Node.js 22.13+ required (Prisma 7 constraint). Use `nvm use 22.13.0`.
- Prisma 7 uses `prisma-client` generator (not `prisma-client-js`). URL is in `prisma.config.ts`, not `schema.prisma`. PrismaClient needs `@prisma/adapter-pg` with connectionString.
- Next.js 16 uses Turbopack by default. The `turbopack: {}` config is set to silence the webpack-config warning.
- NextAuth v5 beta (5.0.0-beta.30) with PrismaAdapter. Session callback adds `user.id`.
- Nodemailer provider is conditionally added only if `EMAIL_SERVER` env var is present.
- ANN mint: `2HuiM4qMkZx4wBLnitmuKG1bQgu5g7YF5VnCAL3Mwk9N`, 9 decimals, mainnet.
- File uploads: native Node fs.promises.writeFile to `public/uploads/`.
- Audio tracks: must be added manually to `public/audio/track-{1-4}.mp3`.
- Build passes clean: `npm run build` with all 11 routes.
