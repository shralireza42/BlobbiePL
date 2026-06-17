"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { getJson, postJson } from "@/lib/client-api";
import { shortenAddress } from "@/lib/format";

type ChatMessage = {
  id: string;
  wallet: string;
  body: string;
  createdAt: number;
};

const MAX_LEN = 280;

export function GlobalChat() {
  const { session } = useWalletSession();
  const canChat = session.authenticated && !!session.wallet;

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

function ChatBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cream/20 bg-paper">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="h-full w-full object-cover" />
      </span>
      <div className={`max-w-[78%] ${mine ? "text-right" : ""}`}>
        <div className="flex items-center gap-2 text-[11px] not-italic text-cream-dim">
          <span className="font-mono">
            {mine ? "You" : shortenAddress(message.wallet, 4)}
          </span>
          <span>·</span>
          <span>{time}</span>
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
