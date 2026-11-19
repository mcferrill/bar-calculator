# Bar Calculator

A personal strength-training companion that makes loading the bar easy and recording workouts habitual. Built primarily for the owner and a few friends—not as a full coaching or fitness platform.

## Purpose and success

The original problem is figuring out which plates to load for warmups and work sets, including when switching bars. The broader goal is low-friction workout logging before, during, or after training.

Success means logging workouts semi-regularly because the app is useful at the bar and recording results takes little effort. History should help reveal training consistency and progression.

## Current capabilities

- **Calculator (`/calculator`):** Enter a working weight and see its plates. Warmups are optional: enter a starting weight to see recommended weights at 33%, 55%, and 75% of the gap, rounded down to 5 lb increments. A collapsed dropdown defaults to a 45 lb bar and can select the 33 lb or 15 lb bar.
- **Authentication:** Better Auth email/password sign-in (`/login`) with server-side sessions, sign-out, and database-backed rate limiting. Accounts are manually provisioned; public registration is disabled. Signed-in users can change their email/password at `/account` by confirming their current password. Workout reads and writes are scoped to the signed-in user.
- **Exercise log (`/`):** Create, edit, and delete server-persisted sessions containing multiple lifts and blocks of sets, reps, and weight. New entries assume pounds. Existing records retain their stored unit, which is preserved when edited but not offered as a selector. Record dates, optional bodyweight, and lift/session notes. Browse history newest first, grouped by month.
- **Workout (`/workout?id=…`):** Start from the exercise log, record individual strength or cardio sets, resume in-progress sessions, remove mistakes, and finish into history. Each recorded set is immediately persisted on the server. Duration (seconds) and distance (meters) are available under cardio/timed activity. Rep ranges remain supported by the data model but are not exposed for entry.
- Inside the recording form, plates update immediately with the entered weight. A bar dropdown and collapsed recommended-warmup section keep the default view compact. A sets field records a block such as 3×5 in one entry.

## Product direction

These are requirements and priorities, not a claim that every feature is implemented:

- Keep a **standalone calculator tab**, usable while logged out and offline. It currently runs client-side; reliable offline opening/reloading still needs support and verification.
- Keep the current barbell warmup formula and fixed standard plate selection. Equipment needs are primarily the owner's; customization is unnecessary for now.
- Focus on strength training, especially Starting Strength–style workouts, while supporting basic cardio and other activity records.
- Make workout entry and returning to a workout easy. The **Start workout → record sets → finish workout** flow now saves recorded sets on the server throughout training. Unsubmitted inputs and session notes are not autosaved; notes save on finish, with a warning before leaving unsaved inputs.
- Make history useful through recent training frequency and previous results for a lift before adding charts.
- Keep persistence on the server. Only manually provisioned users may access logs, with private per-user records. No public registration, OAuth auto-provisioning, or web account-creation endpoint is enabled.

### Priorities

1. Maintain whitelisted authentication and per-user log ownership.
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
- Better Auth with D1-backed credentials and sessions
- Exercise log: owner-scoped D1 queries (`src/lib/session.ts` and `src/lib/workout.ts`)

## Develop

```bash
npm install
cp .dev.vars.example .dev.vars
# Set a random BETTER_AUTH_SECRET in .dev.vars (openssl rand -base64 32).
# BETTER_AUTH_URL must match the local origin, including the port.
npm run db:migrate:local
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
3. Set `BETTER_AUTH_URL` in `wrangler.jsonc` to the canonical HTTPS origin (currently `https://barcalc.app`). Generate a random secret (`openssl rand -base64 32`), then store it with `npx wrangler secret put BETTER_AUTH_SECRET`. Do not commit the secret.
4. Apply migrations: `npm run db:migrate:remote`
5. Deploy: `npm run deploy`
   Or connect the GitHub repo in Cloudflare **Workers Builds** with production branch `astro`.

Custom domain: attach `barcalc.app` on the Worker (zone already on Cloudflare DNS).

## Manual account provisioning

Registration is disabled in Better Auth itself, not just hidden in the UI. Only an operator with D1 access can add accounts. There is no signup page or public provisioning API. Email delivery/password reset is not configured.

After applying migrations, provision an account from a trusted terminal (Node 22.18+). This Bash example prompts without echoing the password and keeps it out of command arguments and shell history:

```bash
read -r -s -p 'New account password (12–128 characters): ' PASSWORD; printf '\n'
printf '%s' "$PASSWORD" | npm run user:add -- --remote --email you@example.com --name 'Your name' --claim-unassigned
unset PASSWORD
```

Use `--local` instead of `--remote` for development. Duplicate email addresses fail rather than replacing an account. The password is hashed with Better Auth's password utility; only its hash reaches D1 via a temporary, restricted-permission SQL file, which is removed afterward.

**Existing workouts:** Migration `0004_auth.sql` leaves legacy rows unassigned and inaccessible. Use `--claim-unassigned` only for the owner's first account to explicitly assign all unowned history and active workouts. Omit it when adding friends. Existing ownership is never changed. Imports also remain unassigned; after importing additional history, explicitly assign those rows to the correct user in D1 before expecting them in the log. No account is created automatically during deployment.

## Updating login credentials

Open **Account** from the signed-in navigation (`/account`). Both email and password changes require the current password and are rate limited, including direct Better Auth API calls. New passwords must be 12–128 characters and match their confirmation. Password changes rotate the current session and sign out all other sessions. Older sessions may require signing out and back in before making sensitive changes.

Email changes take effect immediately for manually provisioned, unverified accounts; there is no email delivery/verification service. Double-check the new address. An address already used by another account is not applied. Changing credentials preserves the user ID and all workout ownership. Forgotten-password recovery remains an operator task; no email reset flow is configured.

Cloudflare Access may remain as an outer gate; it does not determine workout ownership. Better Auth works without Access and does not trust Access identity headers. Exclude `/calculator` from the Access policy if you want it reachable without the outer login. The calculator is statically rendered and does not touch auth or D1; reliable offline reload still needs separate support.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local Astro dev server |
| `npm run check` | Session/auth regression checks and Astro diagnostics |
| `npm run user:add -- …` | Operator-only account provisioning; password on stdin |
| `npm run build` | Generate CF types + production build |
| `npm run preview` | Preview build in workerd |
| `npm run deploy` | Build + `wrangler deploy` |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate:remote` | Apply D1 migrations to remote |

## Exercise log

- Schema: session → lifts → blocks (`sets`, `reps`, optional `repsTo` / `weight` / timed fields)
- Read path: `listSessions` / `activeWorkouts` with the authenticated user ID; no shared live-collection cache
- Write path: POST `/` form → `insertSession`, `updateSession`, or `deleteSession` in `src/lib/session.ts`
- Workout write path: POST `/workout` → `src/lib/workout.ts`. Migration `0003_workouts.sql` adds active/completed status and optimistic revisions; existing sessions remain completed. Stale submissions cannot duplicate or overwrite sets.
- Auth path: `src/middleware.ts` requires a valid Better Auth session for `/`, `/log`, `/workout`, and `/account`, rejects anonymous writes and cross-origin mutations, and marks private/auth responses `no-store`. All session/workout queries also enforce ownership, including ID-based updates/deletes and active workout revisions.
- Migrate before first use: `npm run db:migrate:local` (or `:remote`)

## Local checks

```bash
npm run check
npm run build
```

`scripts/check-auth.mjs` uses an in-memory SQLite database: it checks disabled signup, manually provisioned credentials, secure session cookies, sign-out, origin checks, persistent rate limits, current-password requirements for email/password changes, duplicate emails, password length, session revocation, cross-user read/write denial, and hidden legacy rows. It does not touch local or production data.

With a migrated local server running and `TEST_EMAIL` / `TEST_PASSWORD` exported for a manually provisioned **local test account**, `scripts/check-workout-browser.mjs` exercises the workout lifecycle, validation, resuming, calculator linkage, cardio, kg, mobile/desktop layout, and editing finished sessions. It creates and removes its own test workouts. It requires an existing Playwright installation and Chromium, without adding an application dependency:

```bash
BASE_URL=http://localhost:4322 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_PATH=/absolute/path/to/chromium \
node scripts/check-workout-browser.mjs
```
