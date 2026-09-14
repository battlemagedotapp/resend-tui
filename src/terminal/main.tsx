import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";

import { createMailbox } from "../client.js";
import type { TerminalOptions } from "./options.js";
import { MailboxApp } from "./ui.js";

const serialized = process.env.RESEND_TUI_OPTIONS;
if (!serialized) throw new Error("resend-tui must be started through its executable.");
const options = JSON.parse(serialized) as TerminalOptions;
const renderer = await createCliRenderer({ clearOnShutdown: true, exitOnCtrlC: true });
renderer.setTerminalTitle("Resend mailbox");
createRoot(renderer).render(<MailboxApp mailbox={createMailbox(options)} />);
