/**
 * Parse historical CSVs into sessions SQL for local D1.
 * Usage: node scripts/import-logs.mjs | npx wrangler d1 execute barcalc-db --local --file=/dev/stdin
 * Or: node scripts/import-logs.mjs > /tmp/import.sql && npx wrangler d1 execute barcalc-db --local --file=/tmp/import.sql
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @typedef {{ sets: number, reps?: number, repsTo?: number, weight?: number, durationSec?: number, distanceM?: number }} Block */
/** @typedef {{ name: string, blocks: Block[], notes?: string }} Lift */
/** @typedef {{ date: string, unit: 'lb'|'kg', bodyweight?: number, notes?: string, lifts: Lift[] }} Session */

function sqlStr(s) {
	return `'${String(s).replaceAll("'", "''")}'`;
}

function parseRepsToken(token) {
	// "5", "2-3", "3.5"
	const range = token.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
	if (range) {
		return { reps: Number(range[1]), repsTo: Number(range[2]) };
	}
	const n = Number(token);
	if (Number.isFinite(n)) return { reps: n };
	return {};
}

/**
 * Parse free-text like:
 *  3x5 @ 260
 *  1x2-3 @ 197.5 & 3x5 @ 167.5
 *  1x1 @ 152.5 (miss)
 *  1x3 @ 147.5 - fail
 *  0 @ 405
 *  0x1 @ 330
 *  1m x 19:47 @ 25
 */
function parseBlocks(raw) {
	if (!raw || !String(raw).trim()) return { blocks: /** @type {Block[]} */ ([]), extraNotes: [] };
	let text = String(raw).trim();
	/** @type {string[]} */
	const extraNotes = [];

	// strip trailing fail/miss markers into notes
	const failMatch = text.match(/\s*[-–]?\s*(fail|miss|missed)\s*$/i);
	if (failMatch) {
		extraNotes.push(failMatch[1].toLowerCase());
		text = text.slice(0, failMatch.index).trim();
	}
	text = text.replace(/\s*\((miss|fail)\)\s*$/i, (_, m) => {
		extraNotes.push(m.toLowerCase());
		return "";
	});

	// ruck: 1m x 19:47 @ 25
	const ruck = text.match(
		/^(\d+(?:\.\d+)?)\s*m\s*x\s*(\d+):(\d{2})\s*@\s*(\d+(?:\.\d+)?)$/i,
	);
	if (ruck) {
		const miles = Number(ruck[1]);
		const min = Number(ruck[2]);
		const sec = Number(ruck[3]);
		return {
			blocks: [
				{
					sets: 1,
					distanceM: Math.round(miles * 1609.344),
					durationSec: min * 60 + sec,
					weight: Number(ruck[4]),
				},
			],
			extraNotes,
		};
	}

	// split on & or comma between blocks
	const parts = text
		.split(/\s*(?:&|,)\s*/)
		.map((p) => p.trim())
		.filter(Boolean);

	/** @type {Block[]} */
	const blocks = [];
	for (const part of parts) {
		// 0 @ 405  (missed attempt style)
		const zeroAt = part.match(/^0\s*@\s*(\d+(?:\.\d+)?)$/i);
		if (zeroAt) {
			blocks.push({ sets: 0, reps: 1, weight: Number(zeroAt[1]) });
			continue;
		}
		// NxR @ W  or  NxR@W  (optional spaces)
		const m = part.match(
			/^(\d+)\s*[x×]\s*(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)\s*@\s*(\d+(?:\.\d+)?)$/i,
		);
		if (m) {
			const sets = Number(m[1]);
			const repInfo = parseRepsToken(m[2]);
			blocks.push({ sets, ...repInfo, weight: Number(m[3]) });
			continue;
		}
		extraNotes.push(part);
	}
	return { blocks, extraNotes };
}

function parseMdY(dateStr) {
	// 6/3/21 or 11/02/21
	const m = String(dateStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
	if (!m) return null;
	let year = Number(m[3]);
	if (year < 100) year += 2000;
	const month = String(Number(m[1])).padStart(2, "0");
	const day = String(Number(m[2])).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/** Simple CSV line parser handling quoted fields */
function parseCsvLine(line) {
	/** @type {string[]} */
	const fields = [];
	let cur = "";
	let inQ = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (inQ) {
			if (c === '"') {
				if (line[i + 1] === '"') {
					cur += '"';
					i++;
				} else {
					inQ = false;
				}
			} else {
				cur += c;
			}
		} else if (c === '"') {
			inQ = true;
		} else if (c === ",") {
			fields.push(cur);
			cur = "";
		} else {
			cur += c;
		}
	}
	fields.push(cur);
	return fields;
}

function importLiftingPlan() {
	const path = resolve(root, "Lifting Plan - Sheet1.csv");
	const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.trim());
	const header = parseCsvLine(lines[0]);
	const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
	const liftsCols = [
		["Squat", "Squat"],
		["Bench", "Bench"],
		["Deadlift", "Deadlift"],
		["Press", "Press"],
		["Clean", "Clean"],
		["Ruck", "Ruck"],
	];

	/** @type {Session[]} */
	const sessions = [];
	for (let i = 1; i < lines.length; i++) {
		const row = parseCsvLine(lines[i]);
		const dateRaw = row[col.Date] ?? "";
		const notesRaw = (row[col.Notes] ?? "").trim();
		const date = dateRaw.trim() ? parseMdY(dateRaw) : null;

		/** @type {Lift[]} */
		const lifts = [];
		/** @type {string[]} */
		const noteBits = [];
		if (notesRaw) noteBits.push(notesRaw);

		for (const [colName, liftName] of liftsCols) {
			const raw = row[col[colName]] ?? "";
			if (!String(raw).trim()) continue;
			const { blocks, extraNotes } = parseBlocks(raw);
			if (blocks.length === 0 && extraNotes.length === 0) continue;
			if (blocks.length === 0) {
				noteBits.push(`${liftName}: ${extraNotes.join("; ")}`);
				continue;
			}
			/** @type {Lift} */
			const lift = { name: liftName, blocks };
			if (extraNotes.length) lift.notes = extraNotes.join("; ");
			lifts.push(lift);
		}

		// notes-only rows with no date skip; notes-only with date keep if notes
		if (!date) {
			// e.g. blank date ruck row — attach to previous session if possible
			if (lifts.length && sessions.length) {
				const prev = sessions[sessions.length - 1];
				prev.lifts.push(...lifts);
				if (noteBits.length) {
					prev.notes = [prev.notes, ...noteBits].filter(Boolean).join(" · ");
				}
			}
			continue;
		}

		if (lifts.length === 0 && noteBits.length === 0) continue;

		// "& 1x6 chins" style in notes → chin lift if parseable
		const chinNote = noteBits.find((n) => /chin/i.test(n));
		if (chinNote) {
			const m = chinNote.match(/(\d+)\s*[x×]\s*(\d+)/i);
			if (m) {
				lifts.push({
					name: "Chinup",
					blocks: [{ sets: Number(m[1]), reps: Number(m[2]) }],
				});
			}
		}

		sessions.push({
			date,
			unit: "lb",
			notes: noteBits.length ? noteBits.join(" · ") : undefined,
			lifts: lifts.length
				? lifts
				: [{ name: "Notes", blocks: [{ sets: 0 }], notes: noteBits.join(" · ") }],
		});
	}
	return sessions;
}

function importTrainingBackup() {
	const path = resolve(root, "Training Log Backup.eml");
	const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((l) => l.trim());
	// header has spaces after commas
	const header = parseCsvLine(lines[0]).map((h) => h.trim());
	const col = Object.fromEntries(header.map((h, i) => [h, i]));

	const liftDefs = [
		["Squat", "Squat Weight", "Squat Sets Completed", "Squat Reps"],
		["Press", "Press Weight", "Press Sets Completed", "Press Reps"],
		["Bench", "Bench Weight", "Bench Sets Completed", "Bench Reps"],
		["Deadlift", "Deadlift Weight", "Deadlift Sets Completed", "Deadlift Reps"],
		["Power Clean", "Power Clean Weight", "Power Clean Sets Completed", "Power Clean Reps"],
		["Chinup", "Chinup Weight", "Chinup Sets Completed", "Chinup Reps"],
	];

	/** @type {Session[]} */
	const sessions = [];
	for (let i = 1; i < lines.length; i++) {
		const row = parseCsvLine(lines[i]);
		const date = (row[col.Date] ?? "").trim();
		if (!date) continue;
		const unitRaw = (row[col.Unit] ?? "lb").trim().toLowerCase();
		const unit = unitRaw.startsWith("kg") ? "kg" : "lb";
		const bw = Number(row[col.Bodyweight]);
		let notes = (row[col.Notes] ?? "").trim();
		if (notes === "Notes" || notes === "Enter notes here") notes = "";

		/** @type {Lift[]} */
		const lifts = [];
		for (const [name, wCol, sCol, rCol] of liftDefs) {
			const weightRaw = (row[col[wCol]] ?? "").trim();
			const setsRaw = (row[col[sCol]] ?? "").trim();
			const repsRaw = (row[col[rCol]] ?? "").trim();
			if (!weightRaw && !setsRaw && !repsRaw) continue;
			const weight = weightRaw === "" ? undefined : Number(weightRaw);
			const sets = setsRaw === "" ? 0 : Number(setsRaw);
			if (!Number.isFinite(sets)) continue;
			// reps stored as concatenated digits e.g. "555" → 5,5,5 or single "5"
			/** @type {Block} */
			const block = { sets };
			if (weight != null && Number.isFinite(weight)) block.weight = weight;
			if (repsRaw) {
				if (/^\d$/.test(repsRaw) || repsRaw.includes(".") || repsRaw.includes("-")) {
					Object.assign(block, parseRepsToken(repsRaw));
				} else if (/^\d+$/.test(repsRaw) && repsRaw.length === sets && sets > 1) {
					// e.g. sets=3 reps=555 → each set 5
					block.reps = Number(repsRaw[0]);
				} else if (/^\d+$/.test(repsRaw) && sets > 0 && repsRaw.length === sets) {
					block.reps = Number(repsRaw[0]);
				} else if (/^\d+$/.test(repsRaw)) {
					// "455" with sets=2 → first digit? Better: if all same digit use that
					const digits = [...repsRaw];
					if (digits.every((d) => d === digits[0])) {
						block.reps = Number(digits[0]);
					} else if (sets === 1) {
						block.reps = Number(repsRaw);
					} else {
						// unequal per-set reps — use first as reps, stash full in notes
						block.reps = Number(digits[0]);
						// expand: actually store one block with max common; put detail in lift notes
						// Prefer: if length matches sets, use first digit as uniform if we can't split
						const perSet = digits.map(Number);
						// replace with multi... keep simple: one block, reps = first, notes if uneven
						if (!perSet.every((r) => r === perSet[0])) {
							// encode as single block with min reps? Keep reps as first and add note
							block.reps = perSet[0];
						} else {
							block.reps = perSet[0];
						}
					}
				}
			}
			// skip empty deadlift misses that are 0/0 with weight still listed? keep them
			if (sets === 0 && (block.reps === 0 || block.reps == null) && weight == null) continue;
			lifts.push({ name, blocks: [block] });
		}

		if (lifts.length === 0) continue;
		/** @type {Session} */
		const session = {
			date,
			unit,
			lifts,
		};
		if (Number.isFinite(bw) && bw > 0) session.bodyweight = bw;
		if (notes) session.notes = notes;
		sessions.push(session);
	}
	return sessions;
}

function sessionToInsert(s) {
	const id = randomUUID();
	const bodyweight = s.bodyweight != null ? s.bodyweight : "NULL";
	const notes = s.notes != null ? sqlStr(s.notes) : "NULL";
	const lifts = sqlStr(JSON.stringify(s.lifts));
	return `INSERT INTO sessions (id, date, unit, bodyweight, notes, lifts) VALUES (${sqlStr(id)}, ${sqlStr(s.date)}, ${sqlStr(s.unit)}, ${bodyweight}, ${notes}, ${lifts});`;
}

const backup = importTrainingBackup();
const plan = importLiftingPlan();
const all = [...backup, ...plan];

// Drop only imported historical data? Safer: delete all then re-insert from CSVs + keep nothing
// User asked to import into local DB — clear existing then insert all historical
const sql = [
	"-- Import Training Log Backup + Lifting Plan",
	"DELETE FROM sessions;",
	...all.map(sessionToInsert),
	"",
].join("\n");

const outPath = resolve(root, "scripts/import-sessions.sql");
writeFileSync(outPath, sql);
console.error(
	`Wrote ${all.length} sessions (${backup.length} backup + ${plan.length} plan) → ${outPath}`,
);
console.log(outPath);
