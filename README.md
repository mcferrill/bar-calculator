# Bar Calculator

A personal strength-training companion that makes loading the bar easy and recording workouts habitual. Built primarily for the owner and a few friends—not as a full coaching or fitness platform.

## Purpose and success

The original problem is figuring out which plates to load for warmups and work sets, including when switching bars. The broader goal is low-friction workout logging before, during, or after training.

Success means logging workouts semi-regularly because the app is useful at the bar and recording results takes little effort. History should help reveal training consistency and progression.

## Current capabilities

- **Calculator (`/`):** Enter a working weight and see its plates. Warmups are optional: enter a starting weight to see recommended weights at 33%, 55%, and 75% of the gap, rounded down to 5 lb increments. A collapsed dropdown defaults to a 45 lb bar and can select the 33 lb or 15 lb bar.
- **Exercise log (`/log`):** Create, edit, and delete server-persisted sessions containing multiple lifts and blocks of sets, reps, and weight. New entries assume pounds. Existing records retain their stored unit, which is preserved when edited but not offered as a selector. Record dates, optional bodyweight, and lift/session notes. Browse history newest first, grouped by month.
- **Workout (`/workout?id=…`):** Start from the exercise log, record individual strength or cardio sets, resume in-progress sessions, remove mistakes, and finish into history. Each recorded set is immediately persisted on the server. Duration (seconds) and distance (meters) are available under cardio/timed activity. Rep ranges remain supported by the data model but are not exposed for entry.
- Inside the recording form, plates update immediately with the entered weight. A bar dropdown and collapsed recommended-warmup section keep the default view compact. A sets field records a block such as 3×5 in one entry.

## Product direction

These are requirements and priorities, not a claim that every feature is implemented:

- Keep a **standalone calculator tab**, usable while logged out and offline. It currently runs client-side; reliable offline opening/reloading still needs support and verification.
- Keep the current barbell warmup formula and fixed standard plate selection. Equipment needs are primarily the owner's; customization is unnecessary for now.
- Focus on strength training, especially Starting Strength–style workouts, while supporting basic cardio and other activity records.
- Make workout entry and returning to a workout easy. The **Start workout → record sets → finish workout** flow now saves recorded sets on the server throughout training. Unsubmitted inputs and session notes are not autosaved; notes save on finish, with a warning before leaving unsaved inputs.
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
- Workout write path: POST `/workout` → `src/lib/workout.ts`. Migration `0003_workouts.sql` adds active/completed status and optimistic revisions; existing sessions remain completed. Stale submissions cannot duplicate or overwrite sets.
- Migrate before first use: `npm run db:migrate:local` (or `:remote`)

## Local checks

```bash
node scripts/check-session.mjs
npx astro check
npm run build
```

With a migrated local server running, `scripts/check-workout-browser.mjs` exercises the workout lifecycle, validation, resuming, calculator linkage, cardio, kg, mobile/desktop layout, and editing finished sessions. It creates and removes its own test workouts. It requires an existing Playwright installation and Chromium, without adding an application dependency:

```bash
BASE_URL=http://localhost:4322 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_PATH=/absolute/path/to/chromium \
node scripts/check-workout-browser.mjs
```
