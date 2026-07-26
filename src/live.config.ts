import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import { sessionsLoader } from "./loaders/sessions";
import { liftSchema } from "./lib/session";

const sessions = defineLiveCollection({
	loader: sessionsLoader(),
	schema: z.object({
		date: z.string(),
		unit: z.enum(["lb", "kg"]),
		bodyweight: z.number().optional(),
		notes: z.string().optional(),
		lifts: z.array(liftSchema),
	}),
});

export const collections = { sessions };
