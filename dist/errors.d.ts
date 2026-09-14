export type MailboxErrorCode = "configuration" | "command_failed" | "command_timeout" | "invalid_output" | "delivery_failed" | "message_missing" | "timeout" | "aborted";
export declare class MailboxError extends Error {
    readonly code: MailboxErrorCode;
    constructor(code: MailboxErrorCode, message: string, options?: ErrorOptions);
}
//# sourceMappingURL=errors.d.ts.map