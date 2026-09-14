#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { HELP, parseTerminalOptions } from "./terminal/options.js";

try {
  const options = parseTerminalOptions(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
  } else {
    const entry = fileURLToPath(new URL("./terminal/main.js", import.meta.url));
    const result = spawnSync("bun", [entry], {
      env: { ...process.env, RESEND_TUI_OPTIONS: JSON.stringify(options) },
      stdio: "inherit",
    });
    if (result.error && "code" in result.error && result.error.code === "ENOENT") {
      throw new Error("resend-tui requires Bun. Install Bun and try again.");
    }
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
} catch (cause) {
  const message = cause instanceof Error ? cause.message : "resend-tui could not start.";
  process.stderr.write(`${message}\nRun resend-tui --help for usage.\n`);
  process.exitCode = 1;
}
