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

## Google OAuth setup
1. Create a Supabase project and enable Google under Auth > Providers.
2. In Google Cloud, add the Supabase callback URL shown by the provider setup screen.
3. In Supabase Auth URL settings, add your local and deployed app URLs as redirect URLs.
4. Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `AUTH_ALLOWLIST_EMAILS` in `.env`.
5. Keep at least one admin email in the allowlist if you want to edit wall layouts.

The app exchanges the Google OAuth code at `/auth/callback`, syncs the signed-in user into Prisma by email, and only grants app access to emails on `AUTH_ALLOWLIST_EMAILS`.

## Next implementation steps
1. Wire auth and sessions
2. Persist wall versions / holds / climbs with Prisma
3. Build hold editor on top of uploaded wall image
4. Add create/edit climb flows
5. Add compatibility recompute logic on version changes
