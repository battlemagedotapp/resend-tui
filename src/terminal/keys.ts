export type InboxAction = "down" | "next" | "open" | "previous" | "quit" | "refresh" | "up";
export type MessageAction =
  | "back"
  | "copy"
  | "down"
  | "links"
  | "open"
  | "quit"
  | "refresh"
  | "toggle"
  | "up";

const inboxKeys: Record<string, InboxAction> = {
  down: "down",
  j: "down",
  up: "up",
  k: "up",
  right: "open",
  l: "open",
  return: "open",
  linefeed: "open",
  pagedown: "next",
  n: "next",
  "]": "next",
  pageup: "previous",
  p: "previous",
  "[": "previous",
  left: "previous",
  r: "refresh",
  q: "quit",
};

const messageKeys: Record<string, MessageAction> = {
  escape: "back",
  left: "back",
  h: "back",
  right: "links",
  l: "links",
  r: "refresh",
  t: "toggle",
  q: "quit",
};

const linkKeys: Record<string, MessageAction> = {
  escape: "back",
  left: "back",
  h: "back",
  down: "down",
  j: "down",
  up: "up",
  k: "up",
  return: "open",
  linefeed: "open",
  right: "open",
  l: "open",
  o: "open",
  c: "copy",
  q: "quit",
};

export function inboxAction(key: string) {
  return inboxKeys[key];
}

export function messageAction(key: string, linksOpen: boolean) {
  return (linksOpen ? linkKeys : messageKeys)[key];
}
