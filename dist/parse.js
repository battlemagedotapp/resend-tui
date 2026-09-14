import { MailboxError } from "./errors.js";
import { EMAIL_STATUSES } from "./types.js";
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function readString(record, key) {
    const value = record[key];
    if (typeof value !== "string")
        fail(`Mailbox response is missing ${key}.`);
    return value;
}
function readOptionalString(record, key) {
    const value = record[key];
    if (value === undefined)
        return undefined;
    if (typeof value !== "string")
        fail(`Mailbox response has an invalid ${key}.`);
    return value;
}
function readNumber(record, key) {
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        fail(`Mailbox response is missing ${key}.`);
    }
    return value;
}
function readBoolean(record, key, fallback) {
    const value = record[key];
    if (value === undefined && fallback !== undefined)
        return fallback;
    if (typeof value !== "boolean")
        fail(`Mailbox response is missing ${key}.`);
    return value;
}
function readStrings(record, key) {
    const value = record[key];
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
        fail(`Mailbox response has an invalid ${key}.`);
    }
    return value;
}
function readRecipients(record, key) {
    const value = record[key];
    return typeof value === "string" ? [value] : readStrings(record, key);
}
function readStatus(record) {
    const value = record.status;
    if (typeof value !== "string" || !EMAIL_STATUSES.includes(value)) {
        fail("Mailbox response has an unknown delivery status.");
    }
    return value;
}
function fail(message) {
    throw new MailboxError("invalid_output", message);
}
function parseJson(output) {
    try {
        return JSON.parse(output);
    }
    catch (cause) {
        throw new MailboxError("invalid_output", "Convex returned an unreadable mailbox response.", {
            cause,
        });
    }
}
function parseSummary(value) {
    if (!isRecord(value))
        fail("Mailbox response contains an invalid email.");
    const subject = readOptionalString(value, "subject");
    return {
        id: readString(value, "id"),
        createdAt: readNumber(value, "createdAt"),
        from: readString(value, "from"),
        to: readRecipients(value, "to"),
        ...(subject === undefined ? {} : { subject }),
        status: readStatus(value),
        opened: readBoolean(value, "opened"),
        clicked: readBoolean(value, "clicked", false),
        complained: readBoolean(value, "complained"),
    };
}
export function parseEmailList(output) {
    const value = parseJson(output);
    if (!Array.isArray(value))
        fail("Convex returned an invalid mailbox snapshot.");
    return value.map((email) => {
        if (!isRecord(email))
            fail("Mailbox response contains an invalid email.");
        return parseSummary({
            ...email,
            id: readString(email, "_id"),
            createdAt: readNumber(email, "_creationTime"),
        });
    });
}
export function parseEmailDetail(output, emailId) {
    const value = parseJson(output);
    if (value === null)
        return null;
    if (!isRecord(value))
        fail("Mailbox response contains an invalid email.");
    const optional = {
        resendId: readOptionalString(value, "resendId"),
        errorMessage: readOptionalString(value, "errorMessage"),
        html: readOptionalString(value, "html"),
        text: readOptionalString(value, "text"),
    };
    return {
        ...parseSummary({ ...value, id: emailId, createdAt: readNumber(value, "createdAt") }),
        replyTo: readStrings(value, "replyTo"),
        finalizedAt: readNumber(value, "finalizedAt"),
        ...Object.fromEntries(Object.entries(optional).filter((entry) => entry[1] !== undefined)),
    };
}
//# sourceMappingURL=parse.js.map