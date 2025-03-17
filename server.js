import { serve } from "bun";
import { renderToString } from "react-dom/server";
import App from "./src/app.tsx";

serve({
    fetch: async (req) => {
        return new Response(renderToString(<App />), {
            headers: { "content-type": "text/html" },
        });
    },
});
