import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";

import { prepareRelease } from "./release-package.mjs";

const root = resolve(".");
const directory = await mkdtemp(join(tmpdir(), "resend-tui-package-"));
if (!process.env.RESEND_TUI_GIT_SOURCE) {
  const release = await prepareRelease();
  execFileSync("pnpm", ["--dir", release.directory, "pack", "--pack-destination", directory], {
    cwd: root,
    stdio: "pipe",
  });
}
const tarball = (await readdir(directory)).find((file) => file.endsWith(".tgz"));
await writeFile(
  join(directory, "package.json"),
  JSON.stringify({
    private: true,
    type: "module",
    packageManager: "pnpm@12.0.0",
    dependencies: {
      "@strawdev/resend-tui":
        process.env.RESEND_TUI_GIT_SOURCE ?? `file:${join(directory, tarball)}`,
      "@types/node": "24.13.3",
      convex: "1.45.0",
      typescript: "6.0.3",
    },
  }),
);
await writeFile(
  join(directory, "pnpm-workspace.yaml"),
  'allowBuilds:\n  esbuild: true\npeerDependencyRules:\n  allowedVersions:\n    "bun-ffi-structs@0.3.1>typescript": "6"\n',
);
execFileSync("pnpm", ["--dir", directory, "install"], { cwd: root, stdio: "inherit" });
if (process.env.RESEND_TUI_GIT_SOURCE) {
  execFileSync("pnpm", ["--dir", directory, "install", "--frozen-lockfile"], {
    cwd: root,
    stdio: "inherit",
  });
}
const installedRoot = join(directory, "node_modules/@strawdev/resend-tui");
const manifest = JSON.parse(await readFile(join(installedRoot, "package.json"), "utf8"));
if (manifest.scripts || manifest.devDependencies || manifest.packageManager) {
  throw new Error("Release contains consumer build or development machinery.");
}
if (
  process.env.RESEND_TUI_EXPECTED_VERSION &&
  manifest.version !== process.env.RESEND_TUI_EXPECTED_VERSION
) {
  throw new Error("Git installation did not use the release tag version.");
}
await writeFile(
  join(directory, "consumer.ts"),
  `import {createMailbox,getEmailActionUrl,MailboxError,type MailboxEmail} from '@strawdev/resend-tui';
const mailbox=createMailbox({projectDirectory:'.',deployment:'local'});
void [mailbox,getEmailActionUrl,MailboxError];
const email={} as MailboxEmail; void email;`,
);
execFileSync(
  process.execPath,
  [
    join(root, "node_modules/typescript/bin/tsc"),
    "--noEmit",
    "--strict",
    "--skipLibCheck",
    "--target",
    "ES2023",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "consumer.ts",
  ],
  { cwd: directory, stdio: "inherit" },
);
const result = await build({
  stdin: { contents: "export * from '@strawdev/resend-tui';", resolveDir: directory },
  bundle: true,
  format: "esm",
  metafile: true,
  platform: "node",
  write: false,
});
if (Object.keys(result.metafile.inputs).some((path) => /@opentui|\/open\//.test(path))) {
  throw new Error("Programmatic imports initialize terminal dependencies.");
}
execFileSync(process.execPath, [join(installedRoot, "dist/cli.js"), "--help"], {
  cwd: directory,
  stdio: "pipe",
});
const terminal = spawnSync("bun", [join(installedRoot, "dist/terminal/main.js")], {
  cwd: directory,
  encoding: "utf8",
  env: { ...process.env, RESEND_TUI_OPTIONS: "" },
});
if (terminal.status === 0 || !terminal.stderr.includes("must be started through its executable")) {
  throw new Error("The packaged Bun terminal entry did not initialize as expected.");
}
console.log(
  JSON.stringify({
    source: process.env.RESEND_TUI_GIT_SOURCE ?? tarball,
    version: manifest.version,
  }),
);
