import type { LiveLoader } from "astro/loaders";
import { env } from "cloudflare:workers";
import { getSession, listSessions, type Session } from "../lib/session";

type SessionData = Session;

type EntryFilter = { id: string };

export function sessionsLoader(): LiveLoader<SessionData, EntryFilter> {
	return {
		name: "d1-sessions",
		loadCollection: async () => {
			try {
				const sessions = await listSessions(env.DB);
				return {
					entries: sessions.map(({ id, ...data }) => ({
						id,
						data,
					})),
				};
			} catch (error) {
				return {
					error: new Error("Failed to load sessions", { cause: error }),
				};
			}
		},
		loadEntry: async ({ filter }) => {
			try {
				const session = await getSession(env.DB, filter.id);
				if (!session) return undefined;
				const { id, ...data } = session;
				return { id, data };
			} catch (error) {
				return {
					error: new Error("Failed to load session", { cause: error }),
				};
			}
		},
	};
}
