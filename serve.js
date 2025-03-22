import { serve } from "bun";
import homepage from "./src/index.html";

const server = serve({
    routes: {
        "/": homepage,
    },

    development: true,
});

console.log(`Listening on ${server.url}`);
