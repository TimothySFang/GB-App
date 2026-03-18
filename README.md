# GB App — MVP1

Private mobile-first home climbing wall app.

## MVP1 includes
- Wall versions with additive / modified / reset states
- Manual hold annotation model
- Climb creation with start / middle / finish holds
- Climb ownership rules (only creator can edit/delete)
- Compatibility between old climbs and newer wall versions
- Community ratings and grade votes
- PostgreSQL + Prisma schema

## Stack
- Next.js 14
- React 18
- PostgreSQL
- Prisma

## Getting started
```bash
npm install
cp .env.example .env
npm run dev
```

## Next implementation steps
1. Wire auth and sessions
2. Persist wall versions / holds / climbs with Prisma
3. Build hold editor on top of uploaded wall image
4. Add create/edit climb flows
5. Add compatibility recompute logic on version changes
