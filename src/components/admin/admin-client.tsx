"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletSession } from "@/hooks/useWalletSession";
import { getJson, postJson } from "@/lib/client-api";
import { shortenAddress } from "@/lib/format";
import { WalletButton } from "@/components/wallet-button";
import { Skeleton } from "@/components/ui";

type Overview = {
  hasDatabase: boolean;
  counts: {
    users: number;
    entries: number;
    airdropUsers: number;
    fraudFlags: number;
    pendingCompletions: number;
  };
  users: { wallet: string; createdAt: string; lastSeenAt: string }[];
  airdropUsers: {
    wallet: string;
    totalPoints: number;
    eligibility: string;
    createdAt: string;
  }[];
  drawActivity: {
    wallet: string;
    ticketCount: number;
    usdValue: number;
    mockMode: boolean;
    txHash: string | null;
    createdAt: string;
  }[];
  fraudFlags: {
    id: string;
    wallet: string;
    reason: string;
    details: string | null;
    resolved: boolean;
  }[];
  pendingCompletions: {
    id: string;
    wallet: string;
    task: { title: string; points: number; key: string };
  }[];
  appConfig: Record<string, string>;
};

export function AdminClient() {
  const { session, isConnected } = useWalletSession();

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getJson<Overview>("/api/admin/overview"),
    enabled: session.isAdmin,
    retry: false,
  });

  if (!isConnected || !session.authenticated) {
    return (
      <Gate
        title="Admin access"
        body="Connect and verify the admin wallet to continue."
      />
    );
  }

  if (!session.isAdmin) {
    return (
      <Gate
        title="Not authorized"
        body={`This wallet (${shortenAddress(session.wallet)}) is not an admin. Set ADMIN_WALLET_ADDRESS in the environment.`}
      />
    );
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (error || !data) {
    return <Gate title="Error" body="Failed to load admin data." />;
  }

  return (
    <div className="space-y-8">
      {!data.hasDatabase && (
        <div className="rounded-lg border border-gold/20 bg-gold/5 p-3 text-sm text-gold">
          Database not configured. Set DATABASE_URL and run migrations to enable
          full admin data. Config + flags below still apply at the app level.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Users" value={data.counts.users} />
        <Stat label="Draw Entries" value={data.counts.entries} />
        <Stat label="Airdrop Users" value={data.counts.airdropUsers} />
        <Stat label="Pending Tasks" value={data.counts.pendingCompletions} />
        <Stat label="Fraud Flags" value={data.counts.fraudFlags} highlight />
      </div>

      <ConfigPanel config={data.appConfig} onSaved={refetch} />

      <ExportPanel />

      <PendingCompletions
        items={data.pendingCompletions}
        onChange={refetch}
      />

      <AirdropUsers users={data.airdropUsers} onChange={refetch} />

      <DrawActivity activity={data.drawActivity} />

      <Users users={data.users} />

      <FraudFlags flags={data.fraudFlags} />
    </div>
  );
}

function Gate({ title, body }: { title: string; body: string }) {
  return (
    <div className="card flex flex-col items-center gap-4 p-10 text-center">
      <h3 className="text-xl font-bold text-cream">{title}</h3>
      <p className="max-w-md text-sm text-cream-dim">{body}</p>
      <WalletButton />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-4 ${highlight && value > 0 ? "border-rose-400/40" : ""}`}>
      <p className="stat-label">{label}</p>
      <p className="mt-1 text-2xl font-bold text-cream">{value}</p>
    </div>
  );
}

function ConfigPanel({
  config,
  onSaved,
}: {
  config: Record<string, string>;
  onSaved: () => void;
}) {
  const [mock, setMock] = useState(config.enableMockMode !== "false");
  const [purchase, setPurchase] = useState(
    config.enableTicketPurchase !== "false",
  );
  const [price, setPrice] = useState(config.mockPriceUsd ?? "");
  const [token, setToken] = useState(config.tokenAddress ?? "");
  const [draw, setDraw] = useState(config.dailyDrawAddress ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await postJson("/api/admin/config", {
      enableMockMode: mock,
      enableTicketPurchase: purchase,
      ...(price ? { mockPriceUsd: Number(price) } : {}),
      tokenAddress: token,
      dailyDrawAddress: draw,
    });
    setSaving(false);
    setMsg(res.ok ? "Saved. Note: NEXT_PUBLIC_* env still controls client config until redeploy." : res.error ?? "Failed");
    if (res.ok) onSaved();
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-cream">Configuration</h3>
      <p className="mt-1 text-xs text-cream-dim">
        These values persist to the database (AppConfig). Public client config is
        driven by NEXT_PUBLIC_* env vars at build/deploy time.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Toggle label="Mock Mode" checked={mock} onChange={setMock} />
        <Toggle
          label="Ticket Purchase Enabled"
          checked={purchase}
          onChange={setPurchase}
        />
        <Field
          label="Mock $BLOBBIE Price (USD)"
          value={price}
          onChange={setPrice}
          placeholder="0.0025"
        />
        <Field
          label="$BLOBBIE Token Address"
          value={token}
          onChange={setToken}
          placeholder="0x…"
        />
        <Field
          label="Daily Draw Contract Address"
          value={draw}
          onChange={setDraw}
          placeholder="0x…"
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-accent" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Configuration"}
        </button>
        {msg && <span className="text-xs text-cream-dim">{msg}</span>}
      </div>
    </div>
  );
}

function ExportPanel() {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-cream">Export CSV</h3>
      <div className="mt-4 flex flex-wrap gap-3">
        {(["users", "airdrop", "draw"] as const).map((kind) => (
          <a
            key={kind}
            href={`/api/admin/export?kind=${kind}`}
            className="btn-ghost"
          >
            Export {kind}
          </a>
        ))}
      </div>
    </div>
  );
}

function PendingCompletions({
  items,
  onChange,
}: {
  items: Overview["pendingCompletions"];
  onChange: () => void;
}) {
  async function review(completionId: string, approve: boolean) {
    await postJson("/api/admin/completion", { completionId, approve });
    onChange();
  }
  return (
    <Section title={`Pending Task Reviews (${items.length})`}>
      {items.length === 0 ? (
        <Empty>No pending completions.</Empty>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cream/10 bg-cream/5 p-3 text-sm"
            >
              <span className="font-mono text-cream-soft">
                {shortenAddress(c.wallet, 5)}
              </span>
              <span className="text-cream-dim">
                {c.task.title} (+{c.task.points})
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-ghost px-3 py-1.5 text-emerald-300"
                  onClick={() => review(c.id, true)}
                >
                  Approve
                </button>
                <button
                  className="btn-ghost px-3 py-1.5 text-rose-300"
                  onClick={() => review(c.id, false)}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function AirdropUsers({
  users,
  onChange,
}: {
  users: Overview["airdropUsers"];
  onChange: () => void;
}) {
  async function review(
    wallet: string,
    decision: "APPROVED" | "FLAGGED" | "REJECTED",
  ) {
    await postJson("/api/admin/review", { wallet, decision });
    onChange();
  }
  async function flag(wallet: string) {
    await postJson("/api/admin/flag", { wallet, reason: "MANUAL_FLAG" });
    onChange();
  }

  return (
    <Section title={`Airdrop Users (${users.length})`}>
      {users.length === 0 ? (
        <Empty>No airdrop users yet.</Empty>
      ) : (
        <Table
          headers={["Wallet", "Points", "Eligibility", "Actions"]}
          rows={users.map((u) => [
            <span key="w" className="font-mono">{shortenAddress(u.wallet, 5)}</span>,
            <span key="p">{u.totalPoints}</span>,
            <span key="e">{u.eligibility}</span>,
            <div key="a" className="flex gap-2">
              <button
                className="text-xs text-emerald-300 hover:underline"
                onClick={() => review(u.wallet, "APPROVED")}
              >
                Approve
              </button>
              <button
                className="text-xs text-gold hover:underline"
                onClick={() => review(u.wallet, "FLAGGED")}
              >
                Flag
              </button>
              <button
                className="text-xs text-rose-300 hover:underline"
                onClick={() => flag(u.wallet)}
              >
                Fraud
              </button>
            </div>,
          ])}
        />
      )}
    </Section>
  );
}

function DrawActivity({ activity }: { activity: Overview["drawActivity"] }) {
  return (
    <Section title={`Draw Activity (${activity.length})`}>
      {activity.length === 0 ? (
        <Empty>No draw entries yet.</Empty>
      ) : (
        <Table
          headers={["Wallet", "Tickets", "USD", "Mode"]}
          rows={activity.map((a) => [
            <span key="w" className="font-mono">{shortenAddress(a.wallet, 5)}</span>,
            <span key="t">{a.ticketCount}</span>,
            <span key="u">${a.usdValue.toFixed(2)}</span>,
            <span key="m">{a.mockMode ? "Mock" : "Live"}</span>,
          ])}
        />
      )}
    </Section>
  );
}

function Users({ users }: { users: Overview["users"] }) {
  return (
    <Section title={`Users (${users.length})`}>
      {users.length === 0 ? (
        <Empty>No users yet.</Empty>
      ) : (
        <Table
          headers={["Wallet", "First Seen", "Last Seen"]}
          rows={users.map((u) => [
            <span key="w" className="font-mono">{shortenAddress(u.wallet, 5)}</span>,
            <span key="c">{new Date(u.createdAt).toLocaleDateString()}</span>,
            <span key="l">{new Date(u.lastSeenAt).toLocaleDateString()}</span>,
          ])}
        />
      )}
    </Section>
  );
}

function FraudFlags({ flags }: { flags: Overview["fraudFlags"] }) {
  return (
    <Section title={`Fraud Flags (${flags.length})`}>
      {flags.length === 0 ? (
        <Empty>No fraud flags.</Empty>
      ) : (
        <Table
          headers={["Wallet", "Reason", "Resolved"]}
          rows={flags.map((f) => [
            <span key="w" className="font-mono">{shortenAddress(f.wallet, 5)}</span>,
            <span key="r">{f.reason}</span>,
            <span key="s">{f.resolved ? "Yes" : "No"}</span>,
          ])}
        />
      )}
    </Section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-cream">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-cream-dim">{children}</p>;
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-cream/10">
      <table className="w-full text-sm">
        <thead className="bg-cream/5 text-left text-xs uppercase tracking-wider text-cream-dim">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cream/5">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-cream-soft">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-xl border border-cream/10 bg-cream/5 px-4 py-3"
    >
      <span className="text-sm text-cream">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-accent-lime" : "bg-cream/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-cream-dim">
        {label}
      </span>
      <input
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
