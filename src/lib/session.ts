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

export function rowToSession(row: SessionRow): Session & { id: string } {
	return {
		id: row.id,
		date: row.date,
		unit: row.unit,
		bodyweight: row.bodyweight ?? undefined,
		notes: row.notes ?? undefined,
		lifts: JSON.parse(row.lifts) as Lift[],
	};
}

export async function listSessions(db: D1Database): Promise<(Session & { id: string })[]> {
	const { results } = await db
		.prepare("SELECT id, date, unit, bodyweight, notes, lifts, created_at FROM sessions ORDER BY date DESC, created_at DESC")
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
		.bind(
			id,
			session.date,
			session.unit,
			session.bodyweight ?? null,
			session.notes ?? null,
			JSON.stringify(session.lifts),
		)
		.run();
	return id;
}

/** Parse HTML form fields into a Session. */
export function sessionFromFormData(form: FormData): Session {
	const date = String(form.get("date") ?? "");
	const unit = (String(form.get("unit") ?? "lb") as "lb" | "kg") || "lb";
	const bodyweightRaw = String(form.get("bodyweight") ?? "").trim();
	const notesRaw = String(form.get("notes") ?? "").trim();
	const liftCount = Number(form.get("liftCount") ?? 0);

	const lifts: Lift[] = [];
	for (let i = 0; i < liftCount; i++) {
		const name = String(form.get(`lift_${i}_name`) ?? "").trim();
		if (!name) continue;
		const blockCount = Number(form.get(`lift_${i}_blockCount`) ?? 0);
		const blocks: Block[] = [];
		for (let j = 0; j < blockCount; j++) {
			const sets = Number(form.get(`lift_${i}_block_${j}_sets`));
			const repsRaw = String(form.get(`lift_${i}_block_${j}_reps`) ?? "").trim();
			const repsToRaw = String(form.get(`lift_${i}_block_${j}_repsTo`) ?? "").trim();
			const weightRaw = String(form.get(`lift_${i}_block_${j}_weight`) ?? "").trim();
			if (!Number.isFinite(sets) || sets < 0) continue;
			const block: Block = { sets };
			if (repsRaw !== "") block.reps = Number(repsRaw);
			if (repsToRaw !== "") block.repsTo = Number(repsToRaw);
			if (weightRaw !== "") block.weight = Number(weightRaw);
			blocks.push(block);
		}
		if (blocks.length === 0) continue;
		const liftNotes = String(form.get(`lift_${i}_notes`) ?? "").trim();
		lifts.push({
			name,
			blocks,
			...(liftNotes ? { notes: liftNotes } : {}),
		});
	}

	return sessionSchema.parse({
		date,
		unit,
		bodyweight: bodyweightRaw === "" ? undefined : Number(bodyweightRaw),
		notes: notesRaw === "" ? undefined : notesRaw,
		lifts,
	});
}
