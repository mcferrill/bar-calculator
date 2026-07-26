# Bar Calculator

Calculate barbell plates and warmups for standard, women's, and technique bars.

## Stack

- [Astro](https://astro.build/) + React islands
- Tailwind CSS v4
- Cloudflare Workers (`@astrojs/cloudflare`) + D1
- Exercise log: live content collection (`src/live.config.ts`) over D1

## Develop

```bash
npm install
npm run dev
```

## Build / preview (workerd)

```bash
npm run build
npm run preview
```

## Deploy (Cloudflare Workers)

1. `npx wrangler login`
2. Create D1 (once): `npx wrangler d1 create barcalc-db`  
   Put the returned `database_id` in `wrangler.jsonc` under `d1_databases[0].database_id`.
3. Apply migrations: `npm run db:migrate:remote`
4. Deploy: `npm run deploy`  
   Or connect the GitHub repo in Cloudflare **Workers Builds** with production branch `astro`.

Custom domain: attach `barcalc.app` on the Worker (zone already on Cloudflare DNS).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Astro dev server |
| `npm run build` | Generate CF types + production build |
| `npm run preview` | Preview build in workerd |
| `npm run deploy` | Build + `wrangler deploy` |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations to remote |

## Exercise log

- Schema: session → lifts → blocks (`sets`, `reps`, optional `repsTo` / `weight` / timed fields)
- Read path: `getLiveCollection("sessions")` via D1 live loader
- Write path: POST `/log` form → `insertSession(env.DB, …)`
- Migrate before first use: `npm run db:migrate:local` (or `:remote`)
