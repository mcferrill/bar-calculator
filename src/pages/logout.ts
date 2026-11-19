import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createAuth } from "../lib/auth";

export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
	const result = await createAuth(env).api.signOut({ headers: request.headers, asResponse: true });
	if (!result.ok) return result;
	const headers = new Headers(result.headers);
	headers.set("Location", "/login");
	return new Response(null, { status: 303, headers });
};
