# Project guidance

## Intent

Bar Calculator is a personal strength-training companion for the owner and a few friends. It should make loading the bar easy and recording workouts habitual—not become a full coaching or fitness platform.

The original need is calculating plates for warmups and work sets, including switching bars. The measure of success is semi-regular workout logging with little effort. Support use before, during, and after training; make history useful for tracking consistency and progression.

Read `README.md` for current capabilities, product priorities, and development/deployment commands. Do not describe planned capabilities as already implemented.

## Product constraints

- Preserve a standalone calculator tab. It must work logged out and offline, independently of private logs. Client-side calculation alone does not guarantee offline opening/reloading; verify both when implementing offline support.
- Keep the existing barbell warmup formula: starting load, then 33%, 55%, and 75% of the gap to working weight (intermediate loads rounded down to 5 lb), then working weight.
- Use a fixed standard plate selection for now. Do not add custom equipment inventories or configurable warmup algorithms without a request.
- Prioritize strength training, especially Starting Strength–style workouts. Allow basic cardio and other activities without burdening the strength-entry flow.
- Keep workout persistence on the server. Offline workout-log synchronization is out of scope.
- Accounts and logs are restricted to whitelisted users. Logs must be private and scoped to their owner; enforce authorization on server-side reads and writes, not only in the UI. Whitelist enforcement must cover account creation and log access.
- Authentication and per-user ownership are not implemented yet. Do not treat the current log as ready for private multi-user use.

## Priorities and workflow direction

1. Protect logs with whitelisted authentication and per-user ownership before friends use them.
2. Reduce logging friction and make returning to a workout easy.
3. Show simple consistency/progression information: recent training frequency and previous results for a lift before charts.
4. Expose basic duration/distance entry where appropriate.
5. Support and verify reliable offline access to the calculator.

A Start workout → record sets → finish workout flow, with calculator access for a lift's warmup or work weight, is a candidate to test, not a settled requirement. Keep the standalone calculator regardless. If adding in-progress sessions, save changes on the server as the user goes rather than waiting until completion.

## Implementation approach

- Prefer small changes using the existing stack and native platform features. Avoid speculative abstractions, dependencies, or configuration.
- Preserve input validation, error handling, accessibility, and protection against losing workout data.
- Leave a small runnable regression check for non-trivial logic and run relevant checks. Documentation-only changes do not need an application build.
- Do not add coaching recommendations, custom plate inventories, configurable warmups, or offline log synchronization unless explicitly requested.

## Code map

- `src/pages/index.astro` / `src/components/Calculator.tsx`: standalone calculator.
- `src/pages/log.astro`: log route and server-side create/update/delete handling.
- `src/components/ExerciseLog.tsx`: history and session dialog.
- `src/components/SessionForm.tsx`: workout entry and editing.
- `src/lib/session.ts`: session schema, form conversion, and D1 persistence.
- `src/live.config.ts` / `src/loaders/sessions.ts`: live collection reads.
- `migrations/`: D1 schema migrations.

Stack: Astro with React islands, Tailwind CSS v4, and Cloudflare Workers + D1. Keep persistence and authorization on the server; keep public calculator functionality independent of database/auth availability.
