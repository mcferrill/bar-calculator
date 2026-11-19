// Operator-only provisioning. Password comes from stdin, never a command argument.
import { parseArgs } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { hashPassword } from "better-auth/crypto";

const { values } = parseArgs({ options: {
	email: { type: "string" }, name: { type: "string" },
	local: { type: "boolean" }, remote: { type: "boolean" },
	"claim-unassigned": { type: "boolean" },
} });
const email = values.email?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !values.name?.trim() || Boolean(values.local) === Boolean(values.remote)) {
	throw new Error("Usage: node scripts/add-user.mjs --email you@example.com --name 'Your name' --local|--remote [--claim-unassigned] < password-on-stdin");
}
if (process.stdin.isTTY) throw new Error("Pipe the password on stdin; see README for a hidden password prompt.");
let password = "";
for await (const chunk of process.stdin) {
	password += chunk;
	if (password.length > 1024) throw new Error("Password input too long.");
}
password = password.replace(/\r?\n$/, "");
if (password.length < 12 || password.length > 128) throw new Error("Use a password between 12 and 128 characters.");
const hash = await hashPassword(password);
const sqlValue = (value) => `'${value.replaceAll("'", "''")}'`;
const id = crypto.randomUUID();
const now = Date.now();
// ponytail: manual accounts are the whitelist; no public invitation/admin endpoints.
const sql = `
INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
VALUES (${sqlValue(id)}, ${sqlValue(values.name.trim())}, ${sqlValue(email)}, 0, ${now}, ${now});
INSERT INTO account (id, accountId, providerId, userId, password, createdAt, updatedAt)
VALUES (${sqlValue(crypto.randomUUID())}, ${sqlValue(id)}, 'credential', ${sqlValue(id)}, ${sqlValue(hash)}, ${now}, ${now});
${values["claim-unassigned"] ? `UPDATE sessions SET user_id = ${sqlValue(id)} WHERE user_id IS NULL;` : ""}
`;
const dir = await mkdtemp(join(tmpdir(), "barcalc-user-"));
try {
	const path = join(dir, "user.sql");
	await writeFile(path, sql, { mode: 0o600 });
	// Wrangler executes a D1 SQL file transactionally; duplicate emails fail, never replace users.
	execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)),
		"d1", "execute", "barcalc-db", values.remote ? "--remote" : "--local", `--file=${path}`], { stdio: "inherit" });
	console.log(`Created ${email} (${id}).${values["claim-unassigned"] ? " Assigned previously unowned workouts." : ""}`);
} finally {
	await rm(dir, { recursive: true, force: true });
}
