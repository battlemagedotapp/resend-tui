import type { MailboxEmail } from "./types.js";

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|amp|apos|gt|lt|quot);/gi, (match, entity: string) => {
    const named: Record<string, string> = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      quot: '"',
    };
    const normalized = entity.toLowerCase();
    if (named[normalized]) return named[normalized];
    const hexadecimal = normalized.startsWith("#x");
    const point = Number.parseInt(normalized.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (!Number.isInteger(point) || point < 0 || point > 0x10ffff) return match;
    try {
      return String.fromCodePoint(point);
    } catch {
      return match;
    }
  });
}

function normalizeUrl(candidate: string) {
  const decoded = decodeHtmlEntities(candidate).replace(/[),.;!?'"]+$/, "");
  try {
    const url = new URL(decoded);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function getEmailActionUrls(email: Pick<MailboxEmail, "text" | "html">) {
  const candidates = [
    ...(email.text?.match(/https?:\/\/[^\s<>"']+/g) ?? []),
    ...(email.html?.match(/https?:\/\/[^\s<>"']+/g) ?? []),
  ];
  const urls = new Set<string>();
  for (const candidate of candidates) {
    const url = normalizeUrl(candidate);
    if (url) urls.add(url);
  }
  return [...urls];
}

export function getEmailActionUrl(
  email: Pick<MailboxEmail, "subject" | "text" | "html">,
  expectedPath?: string,
) {
  const url = getEmailActionUrls(email).find(
    (candidate) => !expectedPath || new URL(candidate).pathname === expectedPath,
  );
  if (!url) {
    const expectation = expectedPath ? ` matching ${expectedPath}` : "";
    throw new Error(`No action URL${expectation} found in “${email.subject ?? "email"}”.`);
  }
  return url;
}

export function formatActionUrl(value: string) {
  const url = new URL(value);
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.host}${path}`;
}
