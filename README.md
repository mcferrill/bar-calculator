# Bar Calculator

A personal strength-training companion that makes loading the bar easy and recording workouts habitual. Built primarily for the owner and a few friends—not as a full coaching or fitness platform.

## Purpose and success

The original problem is figuring out which plates to load for warmups and work sets, including when switching bars. The broader goal is low-friction workout logging before, during, or after training.

Success means logging workouts semi-regularly because the app is useful at the bar and recording results takes little effort. History should help reveal training consistency and progression.

## Current capabilities

- **Calculator (`/`):** Enter working and starting warmup weights, choose a 45 lb standard, 33 lb women's, or 15 lb technique bar, and see total weight, weight per side, and plate illustrations. Three intermediate warmups use 33%, 55%, and 75% of the gap between starting and working weight, rounded down to 5 lb increments.
- **Exercise log (`/log`):** Create, edit, and delete server-persisted sessions containing multiple lifts and blocks of sets, reps, and weight. Record dates, lb/kg units, optional bodyweight, and lift/session notes. Browse history newest first, grouped by month.
- The data model supports rep ranges, duration, and distance, but those fields are not currently exposed for entry.

## Product direction

These are requirements and priorities, not a claim that every feature is implemented:

- Keep a **standalone calculator tab**, usable while logged out and offline. It currently runs client-side; reliable offline opening/reloading still needs support and verification.
- Keep the current barbell warmup formula and fixed standard plate selection. Equipment needs are primarily the owner's; customization is unnecessary for now.
- Focus on strength training, especially Starting Strength–style workouts, while supporting basic cardio and other activity records.
- Make workout entry and returning to a workout easy. A **Start workout → record sets → finish workout** flow, with a calculator available for a lift's warmup or work weight, is a candidate—not a settled workflow. If introduced, in-progress sessions should save changes on the server rather than wait for completion.
- Make history useful through recent training frequency and previous results for a lift before adding charts.
- Keep persistence on the server. Only whitelisted users may create accounts or access logs, with private per-user records. Authentication and ownership enforcement are not currently implemented and must precede use by friends.

### Priorities

1. Whitelisted authentication and per-user log ownership.
2. Low-friction workout logging and resuming.
3. Simple visibility into consistency and progression.
4. Basic duration/distance entry without complicating strength entry.
5. Reliable offline access to the standalone calculator.

### Out of scope for now

Custom plate inventories, configurable warmup algorithms, coaching recommendations, and offline workout-log synchronization.

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
- Write path: POST `/log` form → `insertSession`, `updateSession`, or `deleteSession` in `src/lib/session.ts`
- Migrate before first use: `npm run db:migrate:local` (or `:remote`)
