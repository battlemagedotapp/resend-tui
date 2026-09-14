import type { MailboxEmail } from "./types.js";
export declare function getEmailActionUrls(email: Pick<MailboxEmail, "text" | "html">): string[];
export declare function getEmailActionUrl(email: Pick<MailboxEmail, "subject" | "text" | "html">, expectedPath?: string): string;
export declare function formatActionUrl(value: string): string;
//# sourceMappingURL=links.d.ts.map