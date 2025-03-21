import { tailwind } from "@alik6/bun-tailwind-plugin";
import { build, write } from "bun";

const html = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <title>Bar Calculator</title>
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <link rel="stylesheet" type="text/css" href="index.css" />
    </head>
    <body>
        <div id="root"></div>
        <script type="text/javascript" src="index.js"></script>
    </body>
</html>
`;

// Write to output file
await write("dist/index.html", html);

await build({
    entrypoints: ["./src/index.tsx"],
    outdir: "./dist",
    plugins: [
        tailwind({
            // tailwind Configuration
            tailwindConfig: { content: ["src/**/*.{tsx,html}"] },
            // path for output css file
            outputFile: "dist/index.css",
            // path of input file, created if not found with the default tailwind headers
            inputFile: "src/index.css",
            // path where tailwind.config.js will be generated, useful for autocompletion, each time the build method is called the tailwind.config.js will be synced with `tailwindConfig`, recommended path is 'base dir of the project'
            configPath: ".",
        }),
    ],
}).catch((e) => console.error(e));
