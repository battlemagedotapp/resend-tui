import { expect, test } from "vitest";

test("terminal module loads without starting a renderer", async () => {
  const terminal = await import("../src/terminal/ui.js");
  expect(terminal.MailboxApp).toBeTypeOf("function");
});
