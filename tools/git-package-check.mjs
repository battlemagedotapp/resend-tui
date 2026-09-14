import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { prepareRelease } from "./release-package.mjs";

const root = resolve(".");
const { directory } = await prepareRelease();
const git = (...args) => execFileSync("git", args, { cwd: directory, stdio: "pipe" });
git("init", "--quiet");
git("add", ".");
git(
  "-c",
  "user.name=Package fixture",
  "-c",
  "user.email=fixture@example.invalid",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "core.hooksPath=/dev/null",
  "commit",
  "--quiet",
  "-m",
  "Installation fixture",
);
const manifestPath = join(directory, "package.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const tag = `v${manifest.version}`;
git("tag", tag);
await writeFile(manifestPath, JSON.stringify({ ...manifest, version: "0.0.0-development" }));
git("add", ".");
git(
  "-c",
  "user.name=Package fixture",
  "-c",
  "user.email=fixture@example.invalid",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "core.hooksPath=/dev/null",
  "commit",
  "--quiet",
  "-m",
  "Later development work",
);
execFileSync(process.execPath, [join(root, "tools/package-check.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    RESEND_TUI_EXPECTED_VERSION: manifest.version,
    RESEND_TUI_GIT_SOURCE: `git+${pathToFileURL(directory).href}#${tag}`,
  },
});
