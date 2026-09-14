export class MailboxError extends Error {
    code;
    constructor(code, message, options) {
        super(message, options);
        this.name = "MailboxError";
        this.code = code;
    }
}
//# sourceMappingURL=errors.js.map