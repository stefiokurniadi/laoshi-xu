# Laoshi Xu

Next.js flashcard app for Mandarin / HSK practice with Supabase (auth, Postgres, RLS, Realtime).

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in Supabase URL/keys and NEXT_PUBLIC_SITE_URL for local dev.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database migrations

Schema is versioned under `supabase/migrations/` (not only the Dashboard). The file `supabase/schema.sql` is a **reference snapshot**; new DDL should be **new migration files**.

Prerequisites: [Supabase CLI](https://supabase.com/docs/guides/cli) (or use `npx supabase` as in the npm scripts).

| Command | Purpose |
|--------|---------|
| `npm run db:migration:new -- <name>` | Create a new timestamped SQL file in `supabase/migrations/`. |
| `npm run db:push` | Apply pending migrations to the **linked** remote database. |

**Link the CLI to a project** (once per machine, per project ref):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

(`project-ref` is the id in the Supabase project URL: `https://supabase.com/dashboard/project/<project-ref>`.)

**New empty database (e.g. new dev project):** after linking, run `npm run db:push` to apply all migrations from scratch.

**Existing production database** that already matches this schema but has no migration history: do **not** blindly `db:push` without checking. Options:

1. Verify the baseline file matches prod, then mark it applied:  
   `npx supabase migration repair --status applied 20250410120000`
2. Or use `npx supabase db pull` to diff against remote and reconcile (see [Supabase docs](https://supabase.com/docs/guides/cli/managing-environments)).

Local seeds: `supabase/config.toml` points `db.seed` at `supabase/seed.sql`; they run on `supabase db reset` (local stack), not automatically on hosted `db push` unless you run seeds yourself.

## Deploy and environments

Goal: integrate on **development**, ship to **production** when stable.

### Git branches

- **`main`** — production releases (Vercel Production when tied to `main`).
- **`develop`** — ongoing integration; push here first. Merge into `main` when ready to release.

Optional: protect `main` on GitHub (PRs required).

### Vercel

- **Production** — build from `main`; env vars use the **production** Supabase project and `NEXT_PUBLIC_SITE_URL=https://www.laoshixu.com` (or your live canonical URL).
- **Preview** — builds from `develop` and/or PRs. Set **Preview** environment variables to the **development** Supabase project (different `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Set `NEXT_PUBLIC_SITE_URL` to the URL users actually open (preview hostname or a staging subdomain like `https://dev.example.com`).

**Rule:** never point Vercel Preview at the production Supabase project if you want isolated data and safe testing.

### Supabase: second “dev” project (recommended)

1. Create a new Supabase project (e.g. `laoshi-xu-dev`).
2. Link CLI to it: `npx supabase link --project-ref <dev-ref>`.
3. Run `npm run db:push` to apply migrations.
4. Copy **dev** URL + anon + service role into Vercel **Preview** env (and local `.env.local` for staging tests).
5. Repeat linking + `db:push` with **production** `project-ref` when promoting schema changes to prod.

[Supabase branching](https://supabase.com/docs/guides/platform/branching) is an alternative if you use the Vercel integration; migrations in git stay the same.

### Auth and OAuth (dev and prod)

For **each** Supabase project:

- **Authentication → URL configuration:** add the site URL for that environment (localhost, preview URL, production).
- **Google (or other) provider:** in Google Cloud Console, add the **Supabase callback** for that project (`https://<project-ref>.supabase.co/auth/v1/callback`) to authorized redirect URIs.

Your app uses `${NEXT_PUBLIC_SITE_URL}/auth/callback` — that host must match what you configure.

### Release checklist

1. Migrations applied to **dev**; smoke-test Preview (or local against dev Supabase).
2. Merge `develop` → `main`.
3. Confirm Production build; link CLI to **prod** and `npm run db:push` if there are new migrations.

### Optional later

- CI job with `SUPABASE_ACCESS_TOKEN` to run `db push` on deploy.
- [Vercel Analytics / Speed Insights](https://vercel.com/docs) are already wired in the app layout.

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
