import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { createAuth } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
	const path = context.url.pathname.replace(/\/+$/, "") || "/";
	const privatePage = ["/", "/log", "/workout", "/account"].includes(path);
	const authPage = ["/login", "/logout"].includes(path) || path.startsWith("/api/auth/");
	// The public calculator never needs auth or database availability.
	if (!privatePage && !authPage) return next();

	context.locals.user = null;
	let response: Response;
	if (!["GET", "HEAD"].includes(context.request.method) &&
		context.request.headers.get("origin") !== new URL(env.BETTER_AUTH_URL).origin) {
		response = new Response("Invalid request origin.", { status: 403 });
	} else if (privatePage) {
		const session = await createAuth(env).api.getSession({ headers: context.request.headers });
		context.locals.user = session?.user ?? null;
		response = session ? await next() : context.request.method === "GET" || context.request.method === "HEAD"
			? context.redirect("/login", 303)
			: new Response("Sign in before making changes.", { status: 401 });
	} else {
		response = await next();
	}
	response.headers.set("Cache-Control", "private, no-store");
	return response;
});
