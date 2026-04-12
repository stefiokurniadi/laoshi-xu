# Laoshi Xu

Next.js app for Mandarin / HSK flashcards with Supabase (auth, Postgres, RLS, Realtime).

## Getting started

```bash
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL, etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Single production database, two hosts (www vs dev)

You can run **one Supabase project** (production data) behind two deployed sites:

| Site | Example env | `NEXT_PUBLIC_SITE_URL` | `NEXT_PUBLIC_APP_CHANNEL` | Supabase |
|------|-------------|-------------------------|---------------------------|----------|
| Stable | Vercel **Production** (`main`) | `https://www.laoshixu.com` | omit or `stable` | Production URL + keys |
| Experiments | Vercel deployment for `develop` (or second project) + domain `dev.laoshixu.com` | `https://dev.laoshixu.com` | `dev` | **Same** URL + keys as www |

**Tradeoff:** `dev.laoshixu.com` reads and writes the **same** database as www (profiles, review list, leaderboard, etc.). Testing mistakes affect real users. If you need isolated data, use a separate Supabase project for staging instead.

**Feature gating:** Use [`src/lib/deployment.ts`](src/lib/deployment.ts) — `getAppChannel()`, `isDevChannel()`, `isDevHostFromHeaders(host)`. The navbar shows a **Dev** badge when `NEXT_PUBLIC_APP_CHANNEL=dev`. For dev-only API routes, check **both** channel and host on the server so a wrong env cannot expose behavior on www.

`next.config.ts` only redirects apex `laoshixu.com` → `www`; do **not** redirect `dev.laoshixu.com` to www.

### Vercel checklist (dual deploy)

1. **Production** (www): Git branch `main`, Production environment variables — `NEXT_PUBLIC_SITE_URL=https://www.laoshixu.com`, production Supabase keys, no `NEXT_PUBLIC_APP_CHANNEL` or `stable`.
2. **Dev host:** Deploy the branch you use for experiments (e.g. `develop`). In Vercel → **Domains**, assign **`dev.laoshixu.com`** to that deployment (branch / project per your setup).
3. Copy **the same** `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` as production into this deployment’s env.
4. Set **`NEXT_PUBLIC_SITE_URL=https://dev.laoshixu.com`** (must match the browser origin for auth redirects).
5. Set **`NEXT_PUBLIC_APP_CHANNEL=dev`**.
6. Redeploy after changing env vars.

Optional per-feature flags: add e.g. `NEXT_PUBLIC_FEATURE_X=true` only on the dev deployment.

### Supabase Auth and Google OAuth checklist

1. **Authentication → URL configuration:** add **Site URL** and **Redirect URLs** for both `https://www.laoshixu.com` and `https://dev.laoshixu.com` (and `http://localhost:3000` for local dev).
2. **Google (or other) provider:** in Google Cloud Console, the OAuth client must allow Supabase’s callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`). If users start OAuth from both hosts, ensure any extra **authorized JavaScript origins** / redirects Google requires include both front-end origins if applicable.

Magic links and `emailRedirectTo` use `NEXT_PUBLIC_SITE_URL` from **each** Vercel deployment, so users return to the same host they started on.

## Database migrations

Schema is versioned in `supabase/migrations/`. `supabase/schema.sql` is a reference snapshot; new DDL should be new migration files.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:migration:new -- <name>   # edit the new file
npm run db:push                      # apply to linked project
```

See [Supabase CLI migrations](https://supabase.com/docs/guides/cli/managing-environments) for `migration repair` on databases that already matched the baseline before migrations were tracked.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Supabase documentation](https://supabase.com/docs)
