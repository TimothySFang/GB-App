# GB App

Private, mobile-first home climbing wall app hosted on ChatGPT Sites.

## Features

- ChatGPT account sign-in
- Wall layouts with additive, modified, and reset history
- Wall photos stored in Sites object storage
- Manual hold annotation and climb creation
- Climb ownership, favorites, sends, ratings, and grade votes
- Shared persistent data in a Sites D1 database

## Stack

- Next.js 16 and React 19
- Vinext and Cloudflare Workers
- Drizzle ORM and Sites D1
- Sites R2-compatible object storage
- ChatGPT Sites identity

## Local development

Node.js 22.13 or newer is required.

```bash
node /Users/timothyfang/.codex/plugins/cache/openai-curated-remote/sites/1.1.4/scripts/install-dependencies.mjs
npm run db:generate
npm run dev
```

Open the printed local URL and select **Continue with ChatGPT**. Local development uses the Sites test identity `seedy@sites.test`; no OAuth or Supabase setup is required.

For a production-runtime preview, build the app, apply the generated migration, and start Wrangler:

```bash
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_equal_black_widow.sql
npm start
```

## Data and access

The first person to sign in becomes the administrator. Later users are members. Administrators can edit wall layouts; climb creators can edit their own climbs. The deployed Site is private by default.

The previous Supabase/PostgreSQL implementation is preserved on the `codex/legacy-supabase` branch.
