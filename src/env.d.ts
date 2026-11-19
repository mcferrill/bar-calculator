/// <reference path="../.astro/types.d.ts" />
/// <reference path="../worker-configuration.d.ts" />

declare namespace App {
	interface Locals {
		user: import("./lib/auth").AuthUser | null;
	}
}

declare namespace Cloudflare {
	interface Env {
		BETTER_AUTH_URL: string;
		BETTER_AUTH_SECRET: string;
	}
}
