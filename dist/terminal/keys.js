const inboxKeys = {
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
const messageKeys = {
    escape: "back",
    left: "back",
    h: "back",
    right: "links",
    l: "links",
    r: "refresh",
    t: "toggle",
    q: "quit",
};
const linkKeys = {
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
export function inboxAction(key) {
    return inboxKeys[key];
}
export function messageAction(key, linksOpen) {
    return (linksOpen ? linkKeys : messageKeys)[key];
}
//# sourceMappingURL=keys.js.map