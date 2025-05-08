import { file, build, write } from "bun";
//import tailwindPlugin from "bun-plugin-tailwind";

const f = file("src/index.html");
write("dist/index.html", f);

build({
    entrypoints: ["./src/index.tsx"],
    outdir: "./dist",
    //plugins: [tailwindPlugin],
    target: "browser",
});
