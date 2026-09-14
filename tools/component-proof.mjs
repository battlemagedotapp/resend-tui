import { resolve } from "node:path";

import { createMailbox } from "../dist/index.js";

const projectDirectory = process.env.RESEND_TUI_PROJECT;
const deployment = process.env.RESEND_TUI_DEPLOYMENT;
const to = process.env.RESEND_TUI_PROOF_TO;
const subject = process.env.RESEND_TUI_PROOF_SUBJECT;
const sentAfter = Number(process.env.RESEND_TUI_PROOF_SENT_AFTER);
if (!projectDirectory || !deployment || !to || !subject || !Number.isFinite(sentAfter)) {
  throw new Error(
    "Set RESEND_TUI_PROJECT, RESEND_TUI_DEPLOYMENT, RESEND_TUI_PROOF_TO, RESEND_TUI_PROOF_SUBJECT, and RESEND_TUI_PROOF_SENT_AFTER.",
  );
}

const mailbox = createMailbox({ projectDirectory: resolve(projectDirectory), deployment });
const snapshot = await mailbox.listEmails({ limit: 100 });
const email = await mailbox.waitForEmail({ to, subject, sentAfter, timeoutMs: 120_000 });
const detail = await mailbox.getEmail(email.id);
if (!snapshot.some((candidate) => candidate.id === email.id) || !detail) {
  throw new Error("The selected email was not stable across list, wait, and detail reads.");
}
console.log(JSON.stringify({ emailId: email.id, status: email.status }));
