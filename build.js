//import { renderToString } from "react-dom/server";
//import App from "./src/app.tsx";
//import { BunFileSystem } from "bun";

// Generate HTML
//const appHtml = renderToString(<App />);
//const html = `
//<!DOCTYPE html>
//<html>
//<head>
//    <meta charset="UTF-8">
//    <title>Bar Calculator</title>
//    <meta name="viewport" content="width=device-width,initial-scale=1.0">
//    <link rel="stylesheet" type="text/css" href="index.css" />
//</head>
//<body class="bg-gray-900 text-gray-100 h-full">
//    <div id="root">${appHtml}</div>
//</body>
//</html>
//`;
//
//// Write to output file
//await Bun.write("dist/index.html", html);

import { tailwind } from "bun-plugin-tailwind";

await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    plugins: [tailwind()],
});
