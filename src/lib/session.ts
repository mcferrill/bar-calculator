import { z } from "astro/zod";

export const blockSchema = z.object({
	sets: z.number().int().min(0),
	reps: z.number().optional(),
	repsTo: z.number().optional(),
	weight: z.number().optional(),
	durationSec: z.number().int().positive().optional(),
	distanceM: z.number().positive().optional(),
});

export const liftSchema = z.object({
	name: z.string().min(1),
	blocks: z.array(blockSchema).min(1),
	notes: z.string().optional(),
});

export const sessionSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	unit: z.enum(["lb", "kg"]).default("lb"),
	bodyweight: z.number().positive().optional(),
	notes: z.string().optional(),
	lifts: z.array(liftSchema).min(1),
});

export type Block = z.infer<typeof blockSchema>;
export type Lift = z.infer<typeof liftSchema>;
export type Session = z.infer<typeof sessionSchema>;

export type SessionRow = {
	id: string;
	date: string;
	unit: "lb" | "kg";
	bodyweight: number | null;
	notes: string | null;
	lifts: string;
	created_at: string;
};

function parseLifts(raw: string): Lift[] {
	try {
		return liftSchema.array().parse(JSON.parse(raw));
	} catch {
		throw new Error("Stored session lifts are invalid.");
	}
}

export function rowToSession(row: SessionRow): Session & { id: string } {
	return {
		id: row.id,
		date: row.date,
		unit: row.unit,
		bodyweight: row.bodyweight ?? undefined,
		notes: row.notes ?? undefined,
		lifts: parseLifts(row.lifts),
	};
}

export async function listSessions(db: D1Database): Promise<(Session & { id: string })[]> {
	const { results } = await db
		.prepare("SELECT id, date, unit, bodyweight, notes, lifts, created_at FROM sessions WHERE status = 'completed' ORDER BY date DESC, created_at DESC")
		.all<SessionRow>();
	return (results ?? []).map(rowToSession);
}

export async function getSession(
	db: D1Database,
	id: string,
): Promise<(Session & { id: string }) | undefined> {
	const row = await db
		.prepare(
			"SELECT id, date, unit, bodyweight, notes, lifts, created_at FROM sessions WHERE id = ?",
		)
		.bind(id)
		.first<SessionRow>();
	return row ? rowToSession(row) : undefined;
}

function bindSession(session: Session) {
	return [
		session.date,
		session.unit,
		session.bodyweight ?? null,
		session.notes ?? null,
		JSON.stringify(session.lifts),
	] as const;
}

export async function insertSession(
	db: D1Database,
	session: Session,
): Promise<string> {
	const id = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO sessions (id, date, unit, bodyweight, notes, lifts)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		)
		.bind(id, ...bindSession(session))
		.run();
	return id;
}

export async function updateSession(
	db: D1Database,
	id: string,
	session: Session,
): Promise<boolean> {
	const result = await db
		.prepare(
			`UPDATE sessions
			 SET date = ?, unit = ?, bodyweight = ?, notes = ?, lifts = ?
			 WHERE id = ? AND status = 'completed'`,
		)
		.bind(...bindSession(session), id)
		.run();
	return result.success && result.meta.changes > 0;
}

export async function deleteSession(db: D1Database, id: string): Promise<boolean> {
	const result = await db
		.prepare("DELETE FROM sessions WHERE id = ?")
		.bind(id)
		.run();
	return result.success && result.meta.changes > 0;
}

export type BlockDraft = {
	sets: string;
	reps: string;
	repsTo: string;
	weight: string;
	durationSec: string;
	distanceM: string;
};

export type LiftDraft = {
	name: string;
	notes: string;
	blocks: BlockDraft[];
};

export type SessionFormValues = {
	id?: string;
	intent: "create" | "update";
	date: string;
	unit: "lb" | "kg";
	bodyweight: string;
	notes: string;
	lifts: LiftDraft[];
};

function field(form: FormData, name: string): string {
	return String(form.get(name) ?? "").trim();
}

function optNum(raw: string): number | undefined {
	return raw === "" ? undefined : Number(raw);
}

/** Raw form fields, including values that fail validation. */
export function formValuesFromFormData(form: FormData): SessionFormValues {
	const unitRaw = field(form, "unit");
	const liftCount = Number(form.get("liftCount") ?? 0);
	const lifts: LiftDraft[] = [];
	for (let i = 0; i < liftCount; i++) {
		const blockCount = Number(form.get(`lift_${i}_blockCount`) ?? 0);
		const blocks: BlockDraft[] = [];
		for (let j = 0; j < blockCount; j++) {
			blocks.push({
				sets: field(form, `lift_${i}_block_${j}_sets`),
				reps: field(form, `lift_${i}_block_${j}_reps`),
				repsTo: field(form, `lift_${i}_block_${j}_repsTo`),
				weight: field(form, `lift_${i}_block_${j}_weight`),
				durationSec: field(form, `lift_${i}_block_${j}_durationSec`),
				distanceM: field(form, `lift_${i}_block_${j}_distanceM`),
			});
		}
		lifts.push({
			name: field(form, `lift_${i}_name`),
			notes: field(form, `lift_${i}_notes`),
			blocks,
		});
	}
	const id = field(form, "id");
	return {
		...(id ? { id } : {}),
		intent: form.get("intent") === "update" ? "update" : "create",
		date: field(form, "date"),
		unit: unitRaw === "kg" ? "kg" : "lb",
		bodyweight: field(form, "bodyweight"),
		notes: field(form, "notes"),
		lifts,
	};
}

export function sessionToFormValues(session: Session & { id: string }): SessionFormValues {
	return {
		id: session.id,
		intent: "update",
		date: session.date,
		unit: session.unit,
		bodyweight: session.bodyweight?.toString() ?? "",
		notes: session.notes ?? "",
		lifts: session.lifts.map((lift) => ({
			name: lift.name,
			notes: lift.notes ?? "",
			blocks: lift.blocks.map((block) => ({
				sets: String(block.sets),
				reps: block.reps?.toString() ?? "",
				repsTo: block.repsTo?.toString() ?? "",
				weight: block.weight?.toString() ?? "",
				durationSec: block.durationSec?.toString() ?? "",
				distanceM: block.distanceM?.toString() ?? "",
			})),
		})),
	};
}

export function sessionFromFormValues(values: SessionFormValues): Session {
	const lifts: Lift[] = [];
	for (const lift of values.lifts) {
		if (!lift.name) continue;
		const blocks: Block[] = [];
		for (const draft of lift.blocks) {
			const sets = Number(draft.sets);
			if (!Number.isFinite(sets) || sets < 0) continue;
			const block: Block = { sets };
			const reps = optNum(draft.reps);
			const repsTo = optNum(draft.repsTo);
			const weight = optNum(draft.weight);
			const durationSec = optNum(draft.durationSec);
			const distanceM = optNum(draft.distanceM);
			if (reps !== undefined) block.reps = reps;
			if (repsTo !== undefined) block.repsTo = repsTo;
			if (weight !== undefined) block.weight = weight;
			if (durationSec !== undefined) block.durationSec = durationSec;
			if (distanceM !== undefined) block.distanceM = distanceM;
			blocks.push(block);
		}
		if (blocks.length === 0) continue;
		lifts.push({
			name: lift.name,
			blocks,
			...(lift.notes ? { notes: lift.notes } : {}),
		});
	}
	return sessionSchema.parse({
		date: values.date,
		unit: values.unit,
		bodyweight: optNum(values.bodyweight),
		notes: values.notes === "" ? undefined : values.notes,
		lifts,
	});
}

/** Parse HTML form fields into a Session. */
export function sessionFromFormData(form: FormData): Session {
	return sessionFromFormValues(formValuesFromFormData(form));
}
