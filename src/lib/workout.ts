import { z } from "astro/zod";
import { rowToSession, type SessionRow } from "./session";

type WorkoutRow = SessionRow & { status: "active" | "completed"; revision: number };

export async function getWorkout(db: D1Database, id: string) {
	const row = await db.prepare("SELECT * FROM sessions WHERE id = ?").bind(id).first<WorkoutRow>();
	return row ? { ...rowToSession(row), status: row.status, revision: row.revision } : undefined;
}

export async function activeWorkouts(db: D1Database) {
	const { results } = await db.prepare("SELECT * FROM sessions WHERE status = 'active' ORDER BY created_at DESC").all<WorkoutRow>();
	return results.map((row) => ({ ...rowToSession(row), revision: row.revision }));
}

export async function startWorkout(db: D1Database, form: FormData) {
	const date = z.iso.date().parse(form.get("date"));
	const id = crypto.randomUUID();
	await db.prepare("INSERT INTO sessions (id, date, unit, lifts, status) VALUES (?, ?, ?, '[]', 'active')")
		.bind(id, date, "lb").run();
	return id;
}

const optionalNumber = (value: FormDataEntryValue | null) => value == null || value === "" ? undefined : Number(value);
const setSchema = z.object({
	name: z.string().trim().min(1).max(100),
	sets: z.number().int().positive().max(100).default(1),
	reps: z.number().int().positive().optional(),
	weight: z.number().nonnegative().optional(),
	durationSec: z.number().int().positive().optional(),
	distanceM: z.number().positive().optional(),
}).refine((set) => set.reps !== undefined || set.durationSec !== undefined || set.distanceM !== undefined, {
	message: "Enter reps, duration, or distance to record a set.",
});

export function recordedSet(form: FormData) {
	return setSchema.parse({
		name: form.get("name"),
		sets: optionalNumber(form.get("sets")),
		reps: optionalNumber(form.get("reps")),
		weight: optionalNumber(form.get("weight")),
		durationSec: optionalNumber(form.get("durationSec")),
		distanceM: optionalNumber(form.get("distanceM")),
	});
}

export async function changeWorkout(db: D1Database, id: string, form: FormData) {
	const workout = await getWorkout(db, id);
	if (!workout || workout.status !== "active") throw new Error("This workout is no longer active. Return to the log.");
	const revision = z.coerce.number().int().nonnegative().parse(form.get("revision"));
	if (revision !== workout.revision) throw new Error("This workout changed in another tab. Reload before recording another set.");
	const intent = form.get("intent");
	let status = "active";
	let notes = workout.notes ?? "";
	if (intent === "record") {
		const { name, sets, ...block } = recordedSet(form);
		let lift = workout.lifts.find((lift) => lift.name.toLowerCase() === name.toLowerCase());
		if (!lift) {
			lift = { name, blocks: [] };
			workout.lifts.push(lift);
		}
		lift.blocks.push({ sets, ...block });
	} else if (intent === "remove") {
		const li = z.coerce.number().int().nonnegative().parse(form.get("lift"));
		const bi = z.coerce.number().int().nonnegative().parse(form.get("block"));
		if (!workout.lifts[li]?.blocks[bi]) throw new Error("Set not found.");
		workout.lifts[li].blocks.splice(bi, 1);
		workout.lifts = workout.lifts.filter((lift) => lift.blocks.length);
	} else if (intent === "finish") {
		if (!workout.lifts.length) throw new Error("Record at least one set before finishing.");
		notes = z.string().max(10000).parse(form.get("notes") ?? "");
		status = "completed";
	} else if (intent === "discard") {
		const result = await db.prepare("DELETE FROM sessions WHERE id = ? AND status = 'active' AND revision = ?").bind(id, revision).run();
		if (!result.meta.changes) throw new Error("Workout changed. Reload and try again.");
		return "discarded";
	} else {
		throw new Error("Unknown workout action.");
	}
	// ponytail: optimistic revision prevents duplicate submissions and stale tabs overwriting sets.
	const result = await db.prepare("UPDATE sessions SET lifts = ?, notes = ?, status = ?, revision = revision + 1 WHERE id = ? AND status = 'active' AND revision = ?")
		.bind(JSON.stringify(workout.lifts), notes, status, id, revision).run();
	if (!result.meta.changes) throw new Error("Workout changed. Reload and try again.");
	return status;
}
