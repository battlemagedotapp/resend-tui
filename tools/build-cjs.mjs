import { build } from "esbuild";

await build({
  entryPoints: { index: "src/index.ts", links: "src/links.ts" },
  bundle: true,
  format: "cjs",
  outdir: "dist",
  outExtension: { ".js": ".cjs" },
  packages: "external",
  platform: "node",
  sourcemap: true,
  target: "node24",
});
