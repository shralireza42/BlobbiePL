"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getJson, postJson } from "@/lib/client-api";
import { Skeleton } from "@/components/ui";
import { TelegramVerify } from "@/components/airdrop/telegram-verify";

type TaskView = {
  code: "FOLLOW_X" | "JOIN_TELEGRAM" | "BONUS_SOCIAL";
  points: number;
  status: "not_started" | "confirmed" | "failed";
  failedReason?: string | null;
};

type VerifyResponse = {
  task: { code: string; status: string; points: number; message: string };
  bonusGranted?: boolean;
};

type SocialStatus = {
  databaseReady: boolean;
  x: {
    enabled: boolean;
    configured: boolean;
    connected: boolean;
    username: string | null;
    targetUsername: string;
    task: TaskView;
  };
  telegram: {
    enabled: boolean;
    configured: boolean;
    connected: boolean;
    username: string | null;
    botUsername: string;
    channelUrl: string;
    task: TaskView;
  };
  bonus: { unlocked: boolean; task: TaskView };
};

export function SocialTasks({ onChange }: { onChange: () => void }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["social-status"],
    queryFn: () => getJson<SocialStatus>("/api/social/status"),
    refetchInterval: 30_000,
  });

  const refresh = useCallback(() => {
    refetch();
    onChange();
  }, [refetch, onChange]);

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display not-italic">Social Tasks</h3>
        <span className="text-xs not-italic text-cream-dim">Verified rewards</span>
      </div>
      {!data.databaseReady && (
        <p className="mt-2 rounded-lg border border-gold/20 bg-gold/5 p-2 text-xs text-gold">
          Beta Mock Mode — connect a database to enable social verification.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <XTask status={data} onChange={refresh} />
        <TelegramTask status={data} onChange={refresh} />
        <BonusTask status={data} />
      </div>
    </div>
  );
}

function Shell({
  title,
  points,
  state,
  children,
  message,
}: {
  title: string;
  points: number;
  state: TaskView["status"];
  children?: React.ReactNode;
  message?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-cream/10 bg-cream/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-cream">{title}</p>
          <StatusChip state={state} />
        </div>
        {message && <p className="mt-1 text-xs not-italic text-cream-soft">{message}</p>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-neon-purple">+{points}</span>
        {children}
      </div>
    </div>
  );
}

function StatusChip({ state }: { state: TaskView["status"] }) {
  if (state === "confirmed")
    return (
      <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
        ✓ Confirmed
      </span>
    );
  if (state === "failed")
    return (
      <span className="chip border-rose-400/30 bg-rose-400/10 text-rose-300">
        Action needed
      </span>
    );
  return (
    <span className="chip border-cream/15 bg-cream/5 text-cream-dim">Not started</span>
  );
}

function XTask({ status, onChange }: { status: SocialStatus; onChange: () => void }) {
  const x = status.x;
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function verify() {
    setLoading(true);
    setMsg(null);
    const res = await postJson<VerifyResponse>(
      "/api/airdrop/tasks/follow-x/verify",
    );
    setLoading(false);
    setMsg(res.data?.task.message ?? res.error ?? null);
    onChange();
  }

  const confirmed = x.task.status === "confirmed";
  const unavailable = !x.configured;

  return (
    <Shell
      title={`Follow @${x.targetUsername} on X`}
      points={x.task.points}
      state={x.task.status}
      message={msg ?? (x.connected ? `Connected as @${x.username ?? "x"}` : null)}
    >
      {confirmed ? (
        <span className="text-xs not-italic text-emerald-300">+{x.task.points} confirmed</span>
      ) : unavailable ? (
        <span className="text-xs not-italic text-cream-dim">Unavailable</span>
      ) : !x.connected ? (
        <a className="btn-ghost px-4 py-2" href="/api/social/x/connect">
          Connect X
        </a>
      ) : (
        <div className="flex items-center gap-2">
          <a
            className="text-xs not-italic text-neon-cyan hover:underline"
            href={`https://x.com/${x.targetUsername}`}
            target="_blank"
            rel="noreferrer"
          >
            Open @{x.targetUsername}
          </a>
          <button className="btn-ghost px-4 py-2" onClick={verify} disabled={loading}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </div>
      )}
    </Shell>
  );
}

function TelegramTask({ status, onChange }: { status: SocialStatus; onChange: () => void }) {
  const tg = status.telegram;
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const post = useCallback(
    async (telegram?: Record<string, unknown>) => {
      setLoading(true);
      setMsg(null);
      const res = await postJson<VerifyResponse>(
        "/api/airdrop/tasks/join-telegram/verify",
        telegram ? { telegram } : {},
      );
      setLoading(false);
      setMsg(res.data?.task.message ?? res.error ?? null);
      onChange();
    },
    [onChange],
  );

  const confirmed = tg.task.status === "confirmed";
  const unavailable = !tg.configured;

  return (
    <Shell
      title="Join the Blobbie Telegram"
      points={tg.task.points}
      state={tg.task.status}
      message={msg ?? (tg.connected ? `Connected as @${tg.username ?? "telegram"}` : null)}
    >
      {confirmed ? (
        <span className="text-xs not-italic text-emerald-300">+{tg.task.points} confirmed</span>
      ) : unavailable ? (
        <span className="text-xs not-italic text-cream-dim">Unavailable</span>
      ) : (
        <div className="flex items-center gap-2">
          {tg.channelUrl && (
            <a
              className="text-xs not-italic text-neon-cyan hover:underline"
              href={tg.channelUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open channel
            </a>
          )}
          {tg.connected ? (
            <button
              className="btn-ghost px-4 py-2"
              onClick={() => post()}
              disabled={loading}
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
          ) : tg.botUsername ? (
            <TelegramVerify botUsername={tg.botUsername} onAuth={(d) => post(d)} />
          ) : (
            <span className="text-xs not-italic text-cream-dim">Unavailable</span>
          )}
        </div>
      )}
    </Shell>
  );
}

function BonusTask({ status }: { status: SocialStatus }) {
  const b = status.bonus;
  const confirmed = b.task.status === "confirmed";
  return (
    <Shell
      title="Social Bonus"
      points={b.task.points}
      state={b.task.status}
      message={
        confirmed
          ? "Bonus unlocked. Extra points confirmed."
          : b.unlocked
            ? "Unlocked — verify both tasks to claim."
            : "Locked until both social tasks are confirmed."
      }
    >
      {confirmed ? (
        <span className="text-xs not-italic text-emerald-300">+{b.task.points} confirmed</span>
      ) : (
        <span className="text-xs not-italic text-cream-dim">
          {b.unlocked ? "Pending" : "Locked"}
        </span>
      )}
    </Shell>
  );
}
