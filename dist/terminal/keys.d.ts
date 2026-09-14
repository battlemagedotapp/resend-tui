export type InboxAction = "down" | "next" | "open" | "previous" | "quit" | "refresh" | "up";
export type MessageAction = "back" | "copy" | "down" | "links" | "open" | "quit" | "refresh" | "toggle" | "up";
export declare function inboxAction(key: string): InboxAction | undefined;
export declare function messageAction(key: string, linksOpen: boolean): MessageAction | undefined;
//# sourceMappingURL=keys.d.ts.map