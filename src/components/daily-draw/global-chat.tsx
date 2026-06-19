"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { getJson, postJson } from "@/lib/client-api";
import { shortenAddress } from "@/lib/format";
import { characterFor, LEVEL_TITLES } from "@/lib/levels";

type ChatMessage = {
  id: string;
  wallet: string;
  body: string;
  level: number;
  role: string | null;
  createdAt: number;
};

const ROLE_TAG: Record<string, string> = {
  OWNER: "bg-gold text-ink",
  MANAGER: "bg-neon-purple/30 text-neon-purple",
  MODERATOR: "bg-neon-blue/30 text-neon-blue",
  SENIOR: "bg-cream/15 text-cream",
};
const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  MODERATOR: "Moderator",
  SENIOR: "Senior",
};

const MAX_LEN = 280;

export function GlobalChat() {
  const { session } = useWalletSession();
  const canChat = session.authenticated && !!session.wallet && !session.sanctions.chatBlocked;
  const canModerate = session.permissions.includes("CHAT_MODERATE");

  async function moderate(action: string, payload: Record<string, unknown>) {
    return postJson("/api/chat/moderate", { action, ...payload });
  }

  const { data, refetch } = useQuery({
    queryKey: ["global-chat"],
    queryFn: () => getJson<{ messages: ChatMessage[] }>("/api/chat"),
    refetchInterval: 5000,
  });

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const messages = data?.messages ?? [];

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    const res = await postJson("/api/chat", { body });
    setSending(false);
    if (!res.ok) {
      setError(res.error ?? "Could not send message");
      return;
    }
    setText("");
    refetch();
  }

  return (
    <div className="card relative overflow-hidden">
      {/* Blobbie-themed header */}
      <div className="flex items-center justify-between gap-3 border-b border-cream/10 bg-cream/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Blobbie" className="h-full w-full object-cover" />
          </span>
          <div>
            <h3 className="font-display text-lg not-italic leading-none">
              Blobbie Global Chat
            </h3>
            <p className="mt-1 text-xs not-italic text-cream-dim">
              Be kind. Messages are public.
            </p>
          </div>
        </div>
        <span className="chip border-accent-green/40 bg-accent-green/10 text-accent-green">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
          Live
        </span>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="h-72 space-y-3 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="text-3xl">◇</span>
            <p className="mt-2 text-sm not-italic text-cream-dim">
              No messages yet — say gm to the Blobbie community.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              mine={
                !!session.wallet &&
                m.wallet.toLowerCase() === session.wallet.toLowerCase()
              }
              canModerate={canModerate}
              onModerate={async (action, payload) => {
                const res = await moderate(action, payload);
                refetch();
                return res as { ok: boolean; error?: string };
              }}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-cream/10 bg-cream/5 px-4 py-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          placeholder={canChat ? "Message the Blobbie community…" : "Connect & verify wallet to chat"}
          disabled={!canChat || sending}
          className="input flex-1 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canChat || sending || !text.trim()}
          className="btn-accent px-5 py-3"
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
      {error && <p className="px-5 pb-3 text-xs not-italic text-rose-300">{error}</p>}
    </div>
  );
}

function ChatBubble({
  message,
  mine,
  canModerate,
  onModerate,
}: {
  message: ChatMessage;
  mine: boolean;
  canModerate: boolean;
  onModerate: (
    action: string,
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const level = message.level ?? 0;
  const role = message.role;
  return (
    <div className="group flex items-start gap-2.5">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cream/20 bg-paper"
        title={`Level ${level} · ${LEVEL_TITLES[level] ?? ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={characterFor(level)} alt={`Level ${level}`} className="h-full w-full object-cover" />
      </span>
      <div className="max-w-[78%]">
        <div className="flex flex-wrap items-center gap-2 text-[11px] not-italic text-cream-dim">
          <span className="font-mono">
            {mine ? "You" : shortenAddress(message.wallet, 4)}
          </span>
          {role && (
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${ROLE_TAG[role] ?? "bg-cream/15 text-cream"}`}>
              {ROLE_LABEL[role] ?? role}
            </span>
          )}
          <span className="rounded-full border border-accent-lime/40 bg-accent-lime/10 px-1.5 text-[10px] text-accent-lime">
            Lv {level}
          </span>
          <span>·</span>
          <span>{time}</span>
          {canModerate && <ModMenu message={message} onModerate={onModerate} />}
        </div>
        <div
          className={`mt-1 inline-block break-words rounded-2xl border px-3 py-2 text-sm not-italic ${
            mine
              ? "border-accent-lime/40 bg-accent-lime/10 text-cream"
              : "border-cream/10 bg-cream/5 text-cream-soft"
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

const DURATIONS: { label: string; minutes: number | null }[] = [
  { label: "10 min", minutes: 10 },
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 1440 },
  { label: "7 days", minutes: 10080 },
  { label: "Permanent", minutes: null },
];

function ModMenu({
  message,
  onModerate,
}: {
  message: ChatMessage;
  onModerate: (
    action: string,
    payload: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"root" | "mute" | "ban">("root");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    const res = await onModerate(action, payload);
    setBusy(false);
    setStatus(res.ok ? "Done ✓" : res.error ?? "Failed");
    setTimeout(() => {
      setStatus(null);
      setOpen(false);
      setMode("root");
    }, 1200);
  }

  return (
    <span className="relative inline-flex not-italic">
      <button
        className="rounded px-1 text-cream-dim hover:text-cream"
        onClick={() => {
          setOpen((o) => !o);
          setMode("root");
        }}
        title="Moderate"
      >
        ⚙
      </button>
      {open && (
        <span className="absolute right-0 top-5 z-50 w-44 rounded-xl border border-cream/15 bg-bg-elevated p-1.5 text-left shadow-glow">
          {status ? (
            <span className="block px-2 py-1.5 text-[11px] text-accent-lime">{status}</span>
          ) : mode === "root" ? (
            <>
              <ModItem disabled={busy} onClick={() => run("delete", { messageId: message.id })}>
                Delete message
              </ModItem>
              <ModItem disabled={busy} onClick={() => setMode("mute")}>Mute user…</ModItem>
              <ModItem disabled={busy} onClick={() => setMode("ban")}>Ban from chat…</ModItem>
              <ModItem disabled={busy} onClick={() => run("unmute", { wallet: message.wallet })}>
                Unmute
              </ModItem>
              <ModItem disabled={busy} onClick={() => run("unban", { wallet: message.wallet })}>
                Unban
              </ModItem>
            </>
          ) : (
            <>
              <span className="block px-2 py-1 text-[10px] uppercase tracking-wider text-cream-dim">
                {mode === "mute" ? "Mute for" : "Ban for"}
              </span>
              {DURATIONS.map((d) => (
                <ModItem
                  key={d.label}
                  disabled={busy}
                  onClick={() =>
                    run(mode, {
                      wallet: message.wallet,
                      ...(d.minutes ? { durationMinutes: d.minutes } : {}),
                    })
                  }
                >
                  {d.label}
                </ModItem>
              ))}
            </>
          )}
        </span>
      )}
    </span>
  );
}

function ModItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="block w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-cream-soft hover:bg-cream/10 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
