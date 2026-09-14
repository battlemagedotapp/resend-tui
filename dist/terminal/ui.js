import { jsx as _jsx, jsxs as _jsxs } from "@opentui/react/jsx-runtime";
import { MouseButton } from "@opentui/core";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import launch from "open";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatActionUrl, getEmailActionUrls } from "../links.js";
import { inboxAction, messageAction } from "./keys.js";
import { moveSelection, pageWindow, shutdown } from "./navigation.js";
const SNAPSHOT_SIZE = 100;
const REFRESH_INTERVAL_MS = 10_000;
function messageFrom(cause) {
    return cause instanceof Error ? cause.message : "The mailbox encountered an unknown error.";
}
function formatTime(timestamp) {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}
function statusText(email) {
    const activity = [email.opened && "opened", email.clicked && "clicked"]
        .filter(Boolean)
        .join(", ");
    return activity ? `${email.status} · ${activity}` : email.status;
}
function useSnapshot(mailbox) {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState();
    const controller = useRef(undefined);
    const pending = useRef(false);
    const refresh = useCallback(async () => {
        if (pending.current)
            return;
        pending.current = true;
        controller.current?.abort();
        const next = new AbortController();
        controller.current = next;
        try {
            setEmails(await mailbox.listEmails({ limit: SNAPSHOT_SIZE, signal: next.signal }));
            setError(undefined);
        }
        catch (cause) {
            if (!next.signal.aborted)
                setError(messageFrom(cause));
        }
        finally {
            if (!next.signal.aborted)
                setLoading(false);
            pending.current = false;
        }
    }, [mailbox]);
    useEffect(() => {
        void refresh();
        const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
        return () => {
            clearInterval(timer);
            controller.current?.abort();
        };
    }, [refresh]);
    return { emails, error, loading, refresh };
}
function useDetail(mailbox) {
    const [summary, setSummary] = useState();
    const [email, setEmail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState();
    const [showHtml, setShowHtml] = useState(false);
    const request = useRef(0);
    const load = useCallback(async (selected) => {
        const id = ++request.current;
        setLoading(true);
        setError(undefined);
        try {
            const result = await mailbox.getEmail(selected.id);
            if (!result)
                throw new Error("This email is no longer available.");
            if (id === request.current)
                setEmail(result);
        }
        catch (cause) {
            if (id === request.current)
                setError(messageFrom(cause));
        }
        finally {
            if (id === request.current)
                setLoading(false);
        }
    }, [mailbox]);
    const open = useCallback((selected) => {
        setSummary(selected);
        setEmail(null);
        setShowHtml(false);
        void load(selected);
    }, [load]);
    const close = useCallback(() => {
        request.current += 1;
        setSummary(undefined);
        setEmail(null);
        setError(undefined);
        setLoading(false);
        setShowHtml(false);
    }, []);
    return {
        close,
        email,
        error,
        loading,
        open,
        refresh: () => summary && void load(summary),
        showHtml,
        summary,
        toggleHtml: () => email?.html && setShowHtml((current) => !current),
    };
}
function Button({ label, onPress }) {
    return (_jsx("box", { style: { backgroundColor: "#334155", paddingX: 1 }, onMouseUp: (event) => event.button === MouseButton.LEFT && onPress(), children: _jsx("text", { content: label, fg: "#f8fafc" }) }));
}
function Frame({ children, hint, renderer, }) {
    return (_jsxs("box", { style: { flexDirection: "column", height: "100%", overflow: "hidden", padding: 1 }, children: [_jsxs("box", { style: { flexDirection: "row", gap: 1, height: 1, width: "100%" }, children: [_jsx("text", { content: " Resend Mailbox", fg: "#67e8f9" }), _jsx("box", { style: { flexGrow: 1 } }), _jsx(Button, { label: "Quit", onPress: () => shutdown(renderer) })] }), _jsx("box", { style: { flexGrow: 1, marginY: 1, overflow: "hidden", width: "100%" }, children: children }), _jsx("text", { content: hint, fg: "#737373" })] }));
}
function Inbox({ mailbox, renderer, open, }) {
    const { height } = useTerminalDimensions();
    const snapshot = useSnapshot(mailbox);
    const pageSize = Math.max(3, Math.min(10, Math.floor((height - 6) / 2)));
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState(0);
    const window = pageWindow(snapshot.emails.length, pageSize, page);
    const visible = snapshot.emails.slice(window.start, window.end);
    useEffect(() => setPage(window.page), [window.page]);
    useEffect(() => setSelected(0), [window.page, pageSize]);
    const openSelected = () => {
        const email = visible[selected];
        if (email)
            open(email);
    };
    useKeyboard((key) => {
        const actions = {
            down: () => setSelected((value) => moveSelection(value, 1, visible.length)),
            next: () => setPage((value) => Math.min(value + 1, window.pageCount - 1)),
            open: openSelected,
            previous: () => setPage((value) => Math.max(value - 1, 0)),
            quit: () => shutdown(renderer),
            refresh: () => void snapshot.refresh(),
            up: () => setSelected((value) => moveSelection(value, -1, visible.length)),
        };
        const action = inboxAction(key.name);
        if (action)
            actions[action]();
    });
    return (_jsx(Frame, { hint: `↑↓ select · → open · PgUp/PgDn page · r refresh · ${window.page + 1}/${window.pageCount} · q quit`, renderer: renderer, children: _jsx(InboxContent, { emails: visible, ...(snapshot.error ? { error: snapshot.error } : {}), loading: snapshot.loading, selected: selected, onOpen: open, onSelect: setSelected }) }));
}
function InboxContent({ emails, error, loading, selected, onOpen, onSelect, }) {
    if (error)
        return _jsx("text", { content: error, fg: "#f87171" });
    if (loading)
        return _jsx("text", { content: "Loading mailbox\u2026" });
    if (emails.length === 0)
        return _jsx("text", { content: "No email has been sent yet." });
    return (_jsx("box", { style: { flexDirection: "column", height: "100%" }, children: emails.map((email, index) => (_jsxs("box", { style: {
                backgroundColor: index === selected ? "#334155" : "transparent",
                flexDirection: "column",
                height: 2,
                paddingX: 1,
            }, onMouseUp: (event) => {
                if (event.button !== MouseButton.LEFT)
                    return;
                onSelect(index);
                onOpen(email);
            }, children: [_jsx("text", { content: `${index === selected ? "›" : " "} ${email.subject || "(no subject)"}`, wrapMode: "none" }), _jsx("text", { content: `  ${email.to.join(", ")} · ${statusText(email)} · ${formatTime(email.createdAt)}`, fg: "#a3a3a3", wrapMode: "none" })] }, email.id))) }));
}
function MessageLinks({ links, selected }) {
    const visibleCount = Math.min(4, links.length);
    const start = Math.max(0, Math.min(selected - 1, links.length - visibleCount));
    return (_jsx("box", { title: `Links · ${selected + 1}/${links.length}`, style: {
            backgroundColor: "#171717",
            border: true,
            borderColor: "#475569",
            bottom: 0,
            flexDirection: "column",
            left: 0,
            padding: 1,
            position: "absolute",
            right: 0,
            zIndex: 10,
        }, children: links.slice(start, start + visibleCount).map((link, offset) => {
            const index = start + offset;
            return (_jsx("text", { content: `${index === selected ? "›" : " "} ${formatActionUrl(link)}`, fg: index === selected ? "#f8fafc" : "#a3a3a3", wrapMode: "none" }, link));
        }) }));
}
function Message({ detail, renderer, }) {
    const [linksOpen, setLinksOpen] = useState(false);
    const [selected, setSelected] = useState(0);
    const [notice, setNotice] = useState();
    const links = useMemo(() => (detail.email ? getEmailActionUrls(detail.email) : []), [detail.email]);
    useMessageKeyboard({
        detail,
        links,
        linksOpen,
        renderer,
        selected,
        setLinksOpen,
        setNotice,
        setSelected,
    });
    return (_jsx(MessageContent, { detail: detail, links: links, linksOpen: linksOpen, notice: notice, renderer: renderer, selected: selected }));
}
function detailBody(detail) {
    if (!detail.email)
        return detail.loading ? "Loading message…" : "Message unavailable.";
    return ((detail.showHtml ? detail.email.html : detail.email.text || detail.email.html) ||
        "This message has no body.");
}
function MessageContent({ detail, links, linksOpen, notice, renderer, selected, }) {
    const summary = detail.summary;
    const hint = linksOpen
        ? "↑↓ select · Enter open · c copy · ← close · q quit"
        : "← back · l links · t text/HTML · r refresh · q quit";
    return (_jsx(Frame, { hint: hint, renderer: renderer, children: _jsxs("box", { style: { flexDirection: "column", height: "100%", position: "relative" }, children: [_jsx("text", { content: summary.subject || "(no subject)", fg: "#f8fafc", wrapMode: "none" }), _jsx("text", { content: `To: ${summary.to.join(", ")}`, fg: "#a3a3a3", wrapMode: "none" }), _jsx("text", { content: `From: ${summary.from}`, fg: "#a3a3a3", wrapMode: "none" }), _jsx("text", { content: detail.error || notice || `${statusText(summary)} · ${formatTime(summary.createdAt)}`, fg: detail.error ? "#f87171" : "#737373", wrapMode: "none" }), _jsx("scrollbox", { focused: !linksOpen, style: { flexGrow: 1, marginTop: 1 }, children: _jsx("text", { content: detailBody(detail), selectable: true }) }), linksOpen ? _jsx(MessageLinks, { links: links, selected: selected }) : null] }) }));
}
function useMessageKeyboard({ detail, links, linksOpen, renderer, selected, setLinksOpen, setNotice, setSelected, }) {
    useKeyboard((key) => {
        const selectedLink = links[selected];
        const actions = {
            back: () => (linksOpen ? setLinksOpen(false) : detail.close()),
            copy: () => {
                if (!selectedLink)
                    return;
                setNotice(renderer.copyToClipboardOSC52(selectedLink)
                    ? "Link copied."
                    : "Clipboard access was rejected.");
            },
            down: () => setSelected((value) => moveSelection(value, 1, links.length)),
            links: () => {
                if (!links.length)
                    return;
                setSelected(0);
                setLinksOpen(true);
            },
            open: () => {
                if (!selectedLink)
                    return;
                void launch(selectedLink).then(() => setNotice("Link opened in your browser."), (cause) => setNotice(messageFrom(cause)));
            },
            quit: () => shutdown(renderer),
            refresh: detail.refresh,
            toggle: detail.toggleHtml,
            up: () => setSelected((value) => moveSelection(value, -1, links.length)),
        };
        const action = messageAction(key.name, linksOpen);
        if (action)
            actions[action]();
    });
}
export function MailboxApp({ mailbox }) {
    const renderer = useRenderer();
    const detail = useDetail(mailbox);
    return detail.summary ? (_jsx(Message, { detail: detail, renderer: renderer })) : (_jsx(Inbox, { mailbox: mailbox, renderer: renderer, open: detail.open }));
}
//# sourceMappingURL=ui.js.map