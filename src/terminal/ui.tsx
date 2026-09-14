import { MouseButton, type CliRenderer } from "@opentui/core";
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react";
import launch from "open";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatActionUrl, getEmailActionUrls } from "../links.js";
import type { EmailSummary, Mailbox, MailboxEmail } from "../types.js";
import { inboxAction, messageAction, type InboxAction, type MessageAction } from "./keys.js";
import { moveSelection, pageWindow, shutdown } from "./navigation.js";

const SNAPSHOT_SIZE = 100;
const REFRESH_INTERVAL_MS = 10_000;

function messageFrom(cause: unknown) {
  return cause instanceof Error ? cause.message : "The mailbox encountered an unknown error.";
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    timestamp,
  );
}

function statusText(email: EmailSummary) {
  const activity = [email.opened && "opened", email.clicked && "clicked"]
    .filter(Boolean)
    .join(", ");
  return activity ? `${email.status} · ${activity}` : email.status;
}

function useSnapshot(mailbox: Mailbox) {
  const [emails, setEmails] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const controller = useRef<AbortController | undefined>(undefined);
  const pending = useRef(false);

  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    try {
      setEmails(await mailbox.listEmails({ limit: SNAPSHOT_SIZE, signal: next.signal }));
      setError(undefined);
    } catch (cause) {
      if (!next.signal.aborted) setError(messageFrom(cause));
    } finally {
      if (!next.signal.aborted) setLoading(false);
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

function useDetail(mailbox: Mailbox) {
  const [summary, setSummary] = useState<EmailSummary>();
  const [email, setEmail] = useState<MailboxEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [showHtml, setShowHtml] = useState(false);
  const request = useRef(0);

  const load = useCallback(
    async (selected: EmailSummary) => {
      const id = ++request.current;
      setLoading(true);
      setError(undefined);
      try {
        const result = await mailbox.getEmail(selected.id);
        if (!result) throw new Error("This email is no longer available.");
        if (id === request.current) setEmail(result);
      } catch (cause) {
        if (id === request.current) setError(messageFrom(cause));
      } finally {
        if (id === request.current) setLoading(false);
      }
    },
    [mailbox],
  );

  const open = useCallback(
    (selected: EmailSummary) => {
      setSummary(selected);
      setEmail(null);
      setShowHtml(false);
      void load(selected);
    },
    [load],
  );
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

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <box
      style={{ backgroundColor: "#334155", paddingX: 1 }}
      onMouseUp={(event) => event.button === MouseButton.LEFT && onPress()}
    >
      <text content={label} fg="#f8fafc" />
    </box>
  );
}

function Frame({
  children,
  hint,
  renderer,
}: {
  children: React.ReactNode;
  hint: string;
  renderer: CliRenderer;
}) {
  return (
    <box style={{ flexDirection: "column", height: "100%", overflow: "hidden", padding: 1 }}>
      <box style={{ flexDirection: "row", gap: 1, height: 1, width: "100%" }}>
        <text content=" Resend Mailbox" fg="#67e8f9" />
        <box style={{ flexGrow: 1 }} />
        <Button label="Quit" onPress={() => shutdown(renderer)} />
      </box>
      <box style={{ flexGrow: 1, marginY: 1, overflow: "hidden", width: "100%" }}>{children}</box>
      <text content={hint} fg="#737373" />
    </box>
  );
}

function Inbox({
  mailbox,
  renderer,
  open,
}: {
  mailbox: Mailbox;
  renderer: CliRenderer;
  open: (email: EmailSummary) => void;
}) {
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
    if (email) open(email);
  };
  useKeyboard((key) => {
    const actions: Record<InboxAction, () => void> = {
      down: () => setSelected((value) => moveSelection(value, 1, visible.length)),
      next: () => setPage((value) => Math.min(value + 1, window.pageCount - 1)),
      open: openSelected,
      previous: () => setPage((value) => Math.max(value - 1, 0)),
      quit: () => shutdown(renderer),
      refresh: () => void snapshot.refresh(),
      up: () => setSelected((value) => moveSelection(value, -1, visible.length)),
    };
    const action = inboxAction(key.name);
    if (action) actions[action]();
  });
  return (
    <Frame
      hint={`↑↓ select · → open · PgUp/PgDn page · r refresh · ${window.page + 1}/${window.pageCount} · q quit`}
      renderer={renderer}
    >
      <InboxContent
        emails={visible}
        {...(snapshot.error ? { error: snapshot.error } : {})}
        loading={snapshot.loading}
        selected={selected}
        onOpen={open}
        onSelect={setSelected}
      />
    </Frame>
  );
}

function InboxContent({
  emails,
  error,
  loading,
  selected,
  onOpen,
  onSelect,
}: {
  emails: EmailSummary[];
  error?: string;
  loading: boolean;
  selected: number;
  onOpen: (email: EmailSummary) => void;
  onSelect: (index: number) => void;
}) {
  if (error) return <text content={error} fg="#f87171" />;
  if (loading) return <text content="Loading mailbox…" />;
  if (emails.length === 0) return <text content="No email has been sent yet." />;
  return (
    <box style={{ flexDirection: "column", height: "100%" }}>
      {emails.map((email, index) => (
        <box
          key={email.id}
          style={{
            backgroundColor: index === selected ? "#334155" : "transparent",
            flexDirection: "column",
            height: 2,
            paddingX: 1,
          }}
          onMouseUp={(event) => {
            if (event.button !== MouseButton.LEFT) return;
            onSelect(index);
            onOpen(email);
          }}
        >
          <text
            content={`${index === selected ? "›" : " "} ${email.subject || "(no subject)"}`}
            wrapMode="none"
          />
          <text
            content={`  ${email.to.join(", ")} · ${statusText(email)} · ${formatTime(email.createdAt)}`}
            fg="#a3a3a3"
            wrapMode="none"
          />
        </box>
      ))}
    </box>
  );
}

function MessageLinks({ links, selected }: { links: string[]; selected: number }) {
  const visibleCount = Math.min(4, links.length);
  const start = Math.max(0, Math.min(selected - 1, links.length - visibleCount));
  return (
    <box
      title={`Links · ${selected + 1}/${links.length}`}
      style={{
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
      }}
    >
      {links.slice(start, start + visibleCount).map((link, offset) => {
        const index = start + offset;
        return (
          <text
            key={link}
            content={`${index === selected ? "›" : " "} ${formatActionUrl(link)}`}
            fg={index === selected ? "#f8fafc" : "#a3a3a3"}
            wrapMode="none"
          />
        );
      })}
    </box>
  );
}

function Message({
  detail,
  renderer,
}: {
  detail: ReturnType<typeof useDetail>;
  renderer: CliRenderer;
}) {
  const [linksOpen, setLinksOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState<string>();
  const links = useMemo(
    () => (detail.email ? getEmailActionUrls(detail.email) : []),
    [detail.email],
  );
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
  return (
    <MessageContent
      detail={detail}
      links={links}
      linksOpen={linksOpen}
      notice={notice}
      renderer={renderer}
      selected={selected}
    />
  );
}

function detailBody(detail: ReturnType<typeof useDetail>) {
  if (!detail.email) return detail.loading ? "Loading message…" : "Message unavailable.";
  return (
    (detail.showHtml ? detail.email.html : detail.email.text || detail.email.html) ||
    "This message has no body."
  );
}

function MessageContent({
  detail,
  links,
  linksOpen,
  notice,
  renderer,
  selected,
}: {
  detail: ReturnType<typeof useDetail>;
  links: string[];
  linksOpen: boolean;
  notice: string | undefined;
  renderer: CliRenderer;
  selected: number;
}) {
  const summary = detail.summary!;
  const hint = linksOpen
    ? "↑↓ select · Enter open · c copy · ← close · q quit"
    : "← back · l links · t text/HTML · r refresh · q quit";
  return (
    <Frame hint={hint} renderer={renderer}>
      <box style={{ flexDirection: "column", height: "100%", position: "relative" }}>
        <text content={summary.subject || "(no subject)"} fg="#f8fafc" wrapMode="none" />
        <text content={`To: ${summary.to.join(", ")}`} fg="#a3a3a3" wrapMode="none" />
        <text content={`From: ${summary.from}`} fg="#a3a3a3" wrapMode="none" />
        <text
          content={
            detail.error || notice || `${statusText(summary)} · ${formatTime(summary.createdAt)}`
          }
          fg={detail.error ? "#f87171" : "#737373"}
          wrapMode="none"
        />
        <scrollbox focused={!linksOpen} style={{ flexGrow: 1, marginTop: 1 }}>
          <text content={detailBody(detail)} selectable />
        </scrollbox>
        {linksOpen ? <MessageLinks links={links} selected={selected} /> : null}
      </box>
    </Frame>
  );
}

type MessageKeyboardOptions = {
  detail: ReturnType<typeof useDetail>;
  links: string[];
  linksOpen: boolean;
  renderer: CliRenderer;
  selected: number;
  setLinksOpen: (open: boolean) => void;
  setNotice: (notice: string) => void;
  setSelected: React.Dispatch<React.SetStateAction<number>>;
};

function useMessageKeyboard({
  detail,
  links,
  linksOpen,
  renderer,
  selected,
  setLinksOpen,
  setNotice,
  setSelected,
}: MessageKeyboardOptions) {
  useKeyboard((key) => {
    const selectedLink = links[selected];
    const actions: Record<MessageAction, () => void> = {
      back: () => (linksOpen ? setLinksOpen(false) : detail.close()),
      copy: () => {
        if (!selectedLink) return;
        setNotice(
          renderer.copyToClipboardOSC52(selectedLink)
            ? "Link copied."
            : "Clipboard access was rejected.",
        );
      },
      down: () => setSelected((value) => moveSelection(value, 1, links.length)),
      links: () => {
        if (!links.length) return;
        setSelected(0);
        setLinksOpen(true);
      },
      open: () => {
        if (!selectedLink) return;
        void launch(selectedLink).then(
          () => setNotice("Link opened in your browser."),
          (cause) => setNotice(messageFrom(cause)),
        );
      },
      quit: () => shutdown(renderer),
      refresh: detail.refresh,
      toggle: detail.toggleHtml,
      up: () => setSelected((value) => moveSelection(value, -1, links.length)),
    };
    const action = messageAction(key.name, linksOpen);
    if (action) actions[action]();
  });
}

export function MailboxApp({ mailbox }: { mailbox: Mailbox }) {
  const renderer = useRenderer();
  const detail = useDetail(mailbox);
  return detail.summary ? (
    <Message detail={detail} renderer={renderer} />
  ) : (
    <Inbox mailbox={mailbox} renderer={renderer} open={detail.open} />
  );
}
