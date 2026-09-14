import { describe, expect, test } from "vitest";

import { formatActionUrl, getEmailActionUrl, getEmailActionUrls } from "../src/links.js";

describe("email action links", () => {
  test("extracts decoded, safe, unique links in message order", () => {
    expect(
      getEmailActionUrls({
        text: "Verify at https://example.com/verify?token=one&next=two.",
        html: [
          '<a href="https://example.com/verify?token=one&amp;next=two">Verify</a>',
          '<a href="https://example.com/invite/123&quot;>Accept</a>',
          '<a href="mailto:hello@example.com">Email us</a>',
        ].join(""),
      }),
    ).toEqual(["https://example.com/verify?token=one&next=two", "https://example.com/invite/123"]);
  });

  test("selects an exact action path and rejects missing or malformed actions", () => {
    const email = {
      subject: "Account action",
      text: "Help: javascript:alert(1) Verify: https://example.com/api/auth/verify-email?token=one",
    };
    expect(getEmailActionUrl(email, "/api/auth/verify-email")).toBe(
      "https://example.com/api/auth/verify-email?token=one",
    );
    expect(() => getEmailActionUrl(email, "/missing")).toThrow("No action URL matching /missing");
    expect(getEmailActionUrls({ text: "https://[broken" })).toEqual([]);
  });

  test("formats a concise terminal label without exposing query values", () => {
    expect(formatActionUrl("https://example.com/api/auth/verify-email?token=secret")).toBe(
      "example.com/api/auth/verify-email",
    );
  });
});
