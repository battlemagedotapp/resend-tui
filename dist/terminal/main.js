import { jsx as _jsx } from "@opentui/react/jsx-runtime";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createMailbox } from "../client.js";
import { MailboxApp } from "./ui.js";
const serialized = process.env.RESEND_TUI_OPTIONS;
if (!serialized)
    throw new Error("resend-tui must be started through its executable.");
const options = JSON.parse(serialized);
const renderer = await createCliRenderer({ clearOnShutdown: true, exitOnCtrlC: true });
renderer.setTerminalTitle("Resend mailbox");
createRoot(renderer).render(_jsx(MailboxApp, { mailbox: createMailbox(options) }));
//# sourceMappingURL=main.js.map