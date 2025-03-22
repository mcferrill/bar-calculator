import { file, build, write } from "bun";
import tailwindPlugin from "bun-plugin-tailwind";

const f = file("src/index.html");
await write("dist/index.html", f);

await build({
    entrypoints: ["./src/index.tsx"],
    outdir: "./dist",
    plugins: [tailwindPlugin],
    target: "browser",
}).catch((e) => console.error(e));
