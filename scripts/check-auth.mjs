// Node 22.18+: real SQLite queries + Better Auth HTTP handler; no network or persistent data.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { createAuth } from "../src/lib/auth.ts";
import { listSessions, getSession, insertSession, updateSession, deleteSession } from "../src/lib/session.ts";
import { activeWorkouts, getWorkout, startWorkout, changeWorkout } from "../src/lib/workout.ts";

const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON");
for (const file of readdirSync(new URL("../migrations/", import.meta.url)).sort()) {
	if (file.endsWith(".sql")) sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
}
const password = "test-only-password-123";
const hash = await hashPassword(password);
for (const id of ["alice", "bob"]) {
	sqlite.prepare('INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)')
		.run(id, id, `${id}@example.com`, Date.now(), Date.now());
	sqlite.prepare("INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt) VALUES (?, ?, 'credential', ?, ?, ?, ?)")
		.run(id, id, id, hash, Date.now(), Date.now());
}
// Small D1-shaped wrapper runs application SQL against SQLite, not mocked query strings.
const db = { prepare(sql) {
	const statement = sqlite.prepare(sql);
	let args = [];
	return {
		bind(...values) { args = values; return this; },
		async all() { return { results: statement.all(...args) }; },
		async first() { return statement.get(...args) ?? null; },
		async run() { const result = statement.run(...args); return { success: true, meta: { changes: result.changes } }; },
	};
} };
const session = { date: "2026-01-02", unit: "lb", lifts: [{ name: "Squat", blocks: [{ sets: 1, reps: 5, weight: 135 }] }] };
const a = await insertSession(db, "alice", session);
const b = await insertSession(db, "bob", session);
sqlite.prepare("INSERT INTO sessions (id, date, unit, lifts) VALUES ('legacy', '2025-01-01', 'lb', '[]')").run();
assert.deepEqual((await listSessions(db, "alice")).map((s) => s.id), [a]);
assert.deepEqual((await listSessions(db, "bob")).map((s) => s.id), [b]);
assert.equal(await getSession(db, "bob", a), undefined);
assert.equal(await getSession(db, "alice", "legacy"), undefined);
assert.equal(await updateSession(db, "bob", a, { ...session, notes: "stolen" }), false);
assert.equal(await deleteSession(db, "bob", a), false);
assert.equal(await updateSession(db, "alice", a, { ...session, notes: "mine" }), true);
assert.equal((await getSession(db, "alice", a)).notes, "mine");

const form = (entries) => { const data = new FormData(); for (const [k, v] of Object.entries(entries)) data.set(k, String(v)); return data; };
const workout = await startWorkout(db, "alice", form({ date: "2026-01-02", user_id: "bob" }));
assert.equal(await getWorkout(db, "bob", workout), undefined);
assert.equal((await activeWorkouts(db, "bob")).length, 0);
assert.equal((await activeWorkouts(db, "alice"))[0].id, workout);
for (const intent of ["record", "remove", "finish", "discard"]) {
	await assert.rejects(changeWorkout(db, "bob", workout, form({ intent, revision: 0, name: "Squat", reps: 5 })), /no longer active/);
}
await changeWorkout(db, "alice", workout, form({ intent: "record", revision: 0, name: "Squat", reps: 5, weight: 135 }));
await assert.rejects(changeWorkout(db, "alice", workout, form({ intent: "record", revision: 0, name: "Squat", reps: 5 })), /another tab/);
await changeWorkout(db, "alice", workout, form({ intent: "finish", revision: 1 }));
assert.equal((await getWorkout(db, "alice", workout)).status, "completed");
const discarded = await startWorkout(db, "bob", form({ date: "2026-01-02" }));
assert.equal(await changeWorkout(db, "bob", discarded, form({ intent: "discard", revision: 0 })), "discarded");
assert.equal(await deleteSession(db, "alice", a), true);

const origin = "https://barcalc.test";
const auth = createAuth({ DB: sqlite, BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: "test-only-secret-at-least-32-characters-long" });
const request = (path, body, cookie, requestOrigin = origin) => auth.handler(new Request(`${origin}/api/auth/${path}`, {
	method: body ? "POST" : "GET",
	headers: { "content-type": "application/json", origin: requestOrigin, "cf-connecting-ip": "192.0.2.1", ...(cookie ? { cookie } : {}) },
	...(body ? { body: JSON.stringify(body) } : {}),
}));
const signUp = await request("sign-up/email", { name: "Eve", email: "eve@example.com", password });
assert.ok(signUp.status >= 400);
assert.equal(sqlite.prepare("SELECT count(*) AS n FROM user").get().n, 2);
assert.ok((await request("sign-in/email", { email: "alice@example.com", password: "wrong-password" })).status >= 400);
assert.ok((await request("sign-in/email", { email: "alice@example.com", password }, undefined, "https://evil.test")).status >= 400);
const login = await request("sign-in/email", { email: "alice@example.com", password });
assert.equal(login.status, 200, await login.clone().text());
const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
assert.match(cookie, /session_token=/);
assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
assert.match(login.headers.get("set-cookie"), /Secure/i);
assert.match(login.headers.get("set-cookie"), /SameSite=Lax/i);
assert.equal((await auth.api.getSession({ headers: new Headers({ cookie }) })).user.id, "alice");
assert.equal(await auth.api.getSession({ headers: new Headers() }), null);
// Credential updates must be safe even when callers bypass the Account form.
assert.ok((await request("change-email", { newEmail: "new-alice@example.com", currentPassword: password })).status >= 400);
assert.ok((await request("change-email", { newEmail: "new-alice@example.com" }, cookie)).status >= 400);
assert.ok((await request("change-email", { newEmail: "new-alice@example.com", currentPassword: "wrong" }, cookie)).status >= 400);
assert.equal((await request("change-email", { newEmail: "bob@example.com", currentPassword: password }, cookie)).status, 200);
assert.equal((await auth.api.getSession({ headers: new Headers({ cookie }) })).user.email, "alice@example.com");
const changedEmail = await request("change-email", { newEmail: "new-alice@example.com", currentPassword: password }, cookie);
assert.equal(changedEmail.status, 200, await changedEmail.clone().text());
assert.equal((await auth.api.getSession({ headers: new Headers({ cookie }) })).user.email, "new-alice@example.com");
assert.equal((await getWorkout(db, "alice", workout)).id, workout);
assert.equal(sqlite.prepare("SELECT email FROM user WHERE id = 'bob'").get().email, "bob@example.com");
await assert.rejects(auth.api.signInEmail({ body: { email: "alice@example.com", password } }));
const secondLogin = await auth.api.signInEmail({ body: { email: "new-alice@example.com", password }, asResponse: true });
const secondCookie = secondLogin.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
assert.ok((await request("change-password", { currentPassword: "wrong", newPassword: "replacement-password-123" }, cookie)).status >= 400);
assert.ok((await request("change-password", { currentPassword: password, newPassword: "short" }, cookie)).status >= 400);
assert.ok(await auth.api.getSession({ headers: new Headers({ cookie: secondCookie }) }));
const newPassword = "replacement-password-123";
const changedPassword = await request("change-password", { currentPassword: password, newPassword, revokeOtherSessions: false }, cookie);
assert.equal(changedPassword.status, 200, await changedPassword.clone().text());
const newCookie = changedPassword.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
assert.ok(newCookie);
assert.equal(await auth.api.getSession({ headers: new Headers({ cookie }) }), null);
assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: secondCookie }) }), null);
assert.equal((await auth.api.getSession({ headers: new Headers({ cookie: newCookie }) })).user.id, "alice");
await assert.rejects(auth.api.signInEmail({ body: { email: "new-alice@example.com", password } }));
assert.equal((await auth.api.signInEmail({ body: { email: "new-alice@example.com", password: newPassword } })).user.id, "alice");
assert.equal((await request("sign-out", {}, newCookie)).status, 200);
assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: newCookie }) }), null);
let limited;
for (let i = 0; i < 6; i++) limited = await request("sign-in/email", { email: "alice@example.com", password: "wrong-password" });
assert.equal(limited.status, 429);
assert.equal(sqlite.prepare("SELECT count(*) AS n FROM rateLimit").get().n > 0, true);
sqlite.close();
console.log("auth check ok: registration closed, manual credentials work, cookies/logout/origin/rate limits, password-protected email/password changes and session revocation, owner-only sessions and workouts, legacy rows hidden");
