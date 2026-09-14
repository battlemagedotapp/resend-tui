import { cp, mkdir, mkdtemp, readFile, writeFile, appendFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function prepareRelease() {
  const root = resolve(".");
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  execFileSync("pnpm", ["build"], { cwd: root, stdio: "inherit" });
  await mkdir(join(root, "artifacts"), { recursive: true });
  const directory = await mkdtemp(join(root, "artifacts/release-"));
  for (const file of ["dist", "README.md", "LICENSE", "THIRD_PARTY_NOTICES.md"]) {
    await cp(join(root, file), join(directory, file), { recursive: true });
  }
  const {
    scripts: _scripts,
    devDependencies: _dev,
    packageManager: _manager,
    ...published
  } = manifest;
  await writeFile(join(directory, "package.json"), JSON.stringify(published, null, 2) + "\n");
  return { directory, version: manifest.version };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const release = await prepareRelease();
  console.log(JSON.stringify(release));
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `directory=${release.directory}\nversion=${release.version}\n`,
    );
  }
}
