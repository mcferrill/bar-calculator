import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";

export function createAuth(env: { DB: D1Database; BETTER_AUTH_URL: string; BETTER_AUTH_SECRET: string }) {
	if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32 || !env.BETTER_AUTH_URL) {
		throw new Error("Set BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters.");
	}
	return betterAuth({
		database: env.DB,
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
		// No email delivery is configured; require the current password before immediate changes.
		user: { changeEmail: { enabled: true, updateEmailWithoutVerification: true } },
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path === "/change-password") {
					return { context: { body: { ...ctx.body, revokeOtherSessions: true } } };
				}
				if (ctx.path !== "/change-email") return;
				const session = await getSessionFromCtx(ctx, { disableCookieCache: true });
				if (!session) throw new APIError("UNAUTHORIZED", { message: "Sign in to change your email." });
				const password = ctx.body?.currentPassword;
				const account = await ctx.context.internalAdapter.findCredentialAccount(session.user.id);
				if (typeof password !== "string" || !password || password.length > 128 || !account?.password ||
					!await ctx.context.password.verify({ hash: account.password, password })) {
					throw new APIError("BAD_REQUEST", { code: "INVALID_PASSWORD", message: "Current password is incorrect." });
				}
			}),
		},
		rateLimit: {
			enabled: true,
			storage: "database",
			customRules: {
				"/sign-in/email": { window: 60, max: 5 },
				"/change-email": { window: 60, max: 5 },
				"/change-password": { window: 60, max: 5 },
			},
		},
		advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
	});
}

export type AuthUser = ReturnType<typeof createAuth>["$Infer"]["Session"]["user"];
