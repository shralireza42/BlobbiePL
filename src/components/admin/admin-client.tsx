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
    activeUsers: number;
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
  activeUsers: { wallet: string; lastSeenAt: string; createdAt: string }[];
  staff: { wallet: string; role: string; addedBy: string | null }[];
  sanctions: {
    id: string;
    wallet: string;
    scope: string;
    reason: string | null;
    expiresAt: string | null;
    liftedAt: string | null;
    createdAt: string;
  }[];
  features: {
    drawEnabled: boolean;
    airdropEnabled: boolean;
    minigamesEnabled: boolean;
    ticketPurchaseEnabled: boolean;
  };
  referrals: {
    totalReferrals: number;
    topReferrers: { wallet: string; count: number; points: number }[];
  };
  me: {
    wallet: string;
    role: string | null;
    permissions: string[];
    grantableRoles: string[];
  };
};

function can(data: Overview, perm: string) {
  return data.me?.permissions?.includes(perm);
}

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

      <div className="flex items-center justify-between">
        <p className="text-sm not-italic text-cream-dim">
          Signed in as{" "}
          <span className="font-bold text-cream">{data.me?.role ?? "Staff"}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Users" value={data.counts.users} />
        <Stat label="Active (15m)" value={data.counts.activeUsers ?? 0} />
        <Stat label="Draw Entries" value={data.counts.entries} />
        <Stat label="Airdrop Users" value={data.counts.airdropUsers} />
        <Stat label="Pending Tasks" value={data.counts.pendingCompletions} />
        <Stat label="Fraud Flags" value={data.counts.fraudFlags} highlight />
      </div>

      {can(data, "MANAGE_FEATURES") && (
        <FeaturePanel features={data.features} onChange={refetch} />
      )}
      {can(data, "RUN_DRAW") && <RunDrawPanel onChange={refetch} />}

      {can(data, "MANAGE_CONFIG") && (
        <ConfigPanel config={data.appConfig} onSaved={refetch} />
      )}

      {can(data, "EXPORT") && <ExportPanel />}

      {can(data, "MANAGE_ROLES") && (
        <StaffPanel
          staff={data.staff}
          grantable={data.me?.grantableRoles ?? []}
          onChange={refetch}
        />
      )}

      {can(data, "MANAGE_ROLES") && <LevelPanel onChange={refetch} />}

      {can(data, "VIEW_USERS") && (
        <ReferralAdminPanel
          referrals={data.referrals}
          canCredit={can(data, "MANAGE_ROLES")}
          onChange={refetch}
        />
      )}

      {(can(data, "SITE_BAN") || can(data, "CHAT_MODERATE")) && (
        <SanctionPanel
          sanctions={data.sanctions}
          canSiteBan={can(data, "SITE_BAN")}
          onChange={refetch}
        />
      )}

      {can(data, "REVIEW_AIRDROP") && (
        <PendingCompletions items={data.pendingCompletions} onChange={refetch} />
      )}

      {can(data, "REVIEW_AIRDROP") && (
        <AirdropUsers users={data.airdropUsers} onChange={refetch} />
      )}

      <DrawActivity activity={data.drawActivity} />

      {can(data, "VIEW_USERS") && (
        <ActiveUsers users={data.activeUsers} canBan={can(data, "SITE_BAN")} onChange={refetch} />
      )}

      {can(data, "VIEW_USERS") && (
        <Users users={data.users} canBan={can(data, "SITE_BAN")} onChange={refetch} />
      )}

      {can(data, "FLAG_FRAUD") && <FraudFlags flags={data.fraudFlags} />}
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

async function banWallet(wallet: string, permanent: boolean) {
  await postJson("/api/admin/sanction", {
    action: "create",
    wallet,
    scope: "SITE_BAN",
    durationMinutes: permanent ? null : 1440,
  });
}

function BanButtons({ wallet, onChange }: { wallet: string; onChange: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        className="text-xs text-gold hover:underline"
        onClick={async () => {
          await banWallet(wallet, false);
          onChange();
        }}
      >
        Ban 24h
      </button>
      <button
        className="text-xs text-rose-300 hover:underline"
        onClick={async () => {
          await banWallet(wallet, true);
          onChange();
        }}
      >
        Ban perm
      </button>
      <button
        className="text-xs text-emerald-300 hover:underline"
        onClick={async () => {
          await postJson("/api/admin/sanction", { action: "lift", wallet, scope: "SITE_BAN" });
          onChange();
        }}
      >
        Unban
      </button>
    </div>
  );
}

function ActiveUsers({
  users,
  canBan,
  onChange,
}: {
  users: Overview["activeUsers"];
  canBan?: boolean;
  onChange: () => void;
}) {
  return (
    <Section title={`Active Now (${users.length})`}>
      {users.length === 0 ? (
        <Empty>No users active in the last 15 minutes.</Empty>
      ) : (
        <Table
          headers={["Wallet", "Last Seen", ...(canBan ? ["Actions"] : [])]}
          rows={users.map((u) => [
            <span key="w" className="font-mono">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-400" />
              {shortenAddress(u.wallet, 5)}
            </span>,
            <span key="l">{new Date(u.lastSeenAt).toLocaleTimeString()}</span>,
            ...(canBan ? [<BanButtons key="b" wallet={u.wallet} onChange={onChange} />] : []),
          ])}
        />
      )}
    </Section>
  );
}

function Users({
  users,
  canBan,
  onChange,
}: {
  users: Overview["users"];
  canBan?: boolean;
  onChange: () => void;
}) {
  return (
    <Section title={`All Users (${users.length})`}>
      {users.length === 0 ? (
        <Empty>No users yet.</Empty>
      ) : (
        <Table
          headers={["Wallet", "First Seen", "Last Seen", ...(canBan ? ["Actions"] : [])]}
          rows={users.map((u) => [
            <span key="w" className="font-mono">{shortenAddress(u.wallet, 5)}</span>,
            <span key="c">{new Date(u.createdAt).toLocaleDateString()}</span>,
            <span key="l">{new Date(u.lastSeenAt).toLocaleDateString()}</span>,
            ...(canBan ? [<BanButtons key="b" wallet={u.wallet} onChange={onChange} />] : []),
          ])}
        />
      )}
    </Section>
  );
}

function LevelPanel({ onChange }: { onChange: () => void }) {
  const [wallet, setWallet] = useState("");
  const [level, setLevel] = useState("10");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Section title="Set User Level">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input className="input flex-1" placeholder="0x… wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        <select className="input sm:w-32" value={level} onChange={(e) => setLevel(e.target.value)}>
          {Array.from({ length: 11 }, (_, i) => (
            <option key={i} value={String(i)}>Level {i}</option>
          ))}
          <option value="">Clear (auto)</option>
        </select>
        <button
          className="btn-accent"
          onClick={async () => {
            const res = await postJson("/api/admin/level", {
              wallet,
              level: level === "" ? null : Number(level),
            });
            setMsg(res.ok ? "Saved." : res.error ?? "Failed");
            if (res.ok) onChange();
          }}
        >
          Set level
        </button>
      </div>
      {msg && <p className="mt-2 text-xs not-italic text-cream-dim">{msg}</p>}
      <p className="mt-2 text-xs not-italic text-cream-dim">
        Overrides the points-based level. Owners are always level 10.
      </p>
    </Section>
  );
}

function ReferralAdminPanel({
  referrals,
  canCredit,
  onChange,
}: {
  referrals: Overview["referrals"];
  canCredit?: boolean;
  onChange: () => void;
}) {
  const [referrer, setReferrer] = useState("");
  const [referee, setReferee] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Section title={`Referrals — ${referrals.totalReferrals} total`}>
      {canCredit && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <input className="input flex-1" placeholder="Referrer 0x…" value={referrer} onChange={(e) => setReferrer(e.target.value)} />
          <input className="input flex-1" placeholder="Friend 0x…" value={referee} onChange={(e) => setReferee(e.target.value)} />
          <button
            className="btn-accent"
            onClick={async () => {
              const res = await postJson("/api/admin/referral", { referrer, referee });
              setMsg(res.ok ? "Credited." : res.error ?? "Failed");
              if (res.ok) { setReferrer(""); setReferee(""); onChange(); }
            }}
          >
            Credit referral
          </button>
        </div>
      )}
      {msg && <p className="mb-2 text-xs not-italic text-cream-dim">{msg}</p>}
      {referrals.topReferrers.length === 0 ? (
        <Empty>No referrals yet.</Empty>
      ) : (
        <Table
          headers={["Rank", "Referrer", "Friends", "Points"]}
          rows={referrals.topReferrers.map((r, i) => [
            <span key="r">#{i + 1}</span>,
            <span key="w" className="font-mono">{shortenAddress(r.wallet, 5)}</span>,
            <span key="c">{r.count}</span>,
            <span key="p">{r.points}</span>,
          ])}
        />
      )}
    </Section>
  );
}

function FeaturePanel({
  features,
  onChange,
}: {
  features: Overview["features"];
  onChange: () => void;
}) {
  async function toggle(feature: string, enabled: boolean) {
    await postJson("/api/admin/features", { feature, enabled });
    onChange();
  }
  return (
    <Section title="Feature Controls">
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle label="Daily Rewards Draw" checked={features.drawEnabled} onChange={(v) => toggle("drawEnabled", v)} />
        <Toggle label="Ticket Purchase" checked={features.ticketPurchaseEnabled} onChange={(v) => toggle("ticketPurchaseEnabled", v)} />
        <Toggle label="Airdrop Hub" checked={features.airdropEnabled} onChange={(v) => toggle("airdropEnabled", v)} />
        <Toggle label="Mini-Games" checked={features.minigamesEnabled} onChange={(v) => toggle("minigamesEnabled", v)} />
      </div>
    </Section>
  );
}

function RunDrawPanel({ onChange }: { onChange: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <Section title="Draw Controls">
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn-accent"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const res = await postJson<{ message: string }>("/api/admin/draw/run");
            setLoading(false);
            setMsg(res.data?.message ?? res.error ?? null);
            onChange();
          }}
        >
          {loading ? "Drawing…" : "Force draw current round"}
        </button>
        {msg && <span className="text-xs not-italic text-cream-dim">{msg}</span>}
      </div>
      <p className="mt-2 text-xs not-italic text-cream-dim">
        Settles the open round now (picks winners with a verifiable seed) and
        starts the 3-minute cooldown.
      </p>
    </Section>
  );
}

function StaffPanel({
  staff,
  grantable,
  onChange,
}: {
  staff: Overview["staff"];
  grantable: string[];
  onChange: () => void;
}) {
  const [wallet, setWallet] = useState("");
  const [role, setRole] = useState(grantable[0] ?? "SENIOR");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Section title={`Staff & Roles (${staff.length})`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input className="input flex-1" placeholder="0x… wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        <select className="input sm:w-44" value={role} onChange={(e) => setRole(e.target.value)}>
          {grantable.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          className="btn-accent"
          onClick={async () => {
            const res = await postJson("/api/admin/staff", { action: "set", wallet, role });
            setMsg(res.ok ? "Saved." : res.error ?? "Failed");
            if (res.ok) { setWallet(""); onChange(); }
          }}
        >
          Grant role
        </button>
      </div>
      {msg && <p className="mt-2 text-xs not-italic text-cream-dim">{msg}</p>}
      <div className="mt-4">
        {staff.length === 0 ? (
          <Empty>No staff yet. The env owner wallet is the Owner.</Empty>
        ) : (
          <Table
            headers={["Wallet", "Role", "Actions"]}
            rows={staff.map((s) => [
              <span key="w" className="font-mono">{shortenAddress(s.wallet, 5)}</span>,
              <span key="r">{s.role}</span>,
              <button
                key="x"
                className="text-xs text-rose-300 hover:underline"
                onClick={async () => {
                  await postJson("/api/admin/staff", { action: "remove", wallet: s.wallet });
                  onChange();
                }}
              >
                Remove
              </button>,
            ])}
          />
        )}
      </div>
    </Section>
  );
}

function SanctionPanel({
  sanctions,
  canSiteBan,
  onChange,
}: {
  sanctions: Overview["sanctions"];
  canSiteBan?: boolean;
  onChange: () => void;
}) {
  const [wallet, setWallet] = useState("");
  const [scope, setScope] = useState(canSiteBan ? "SITE_BAN" : "CHAT_MUTE");
  const [mins, setMins] = useState("");
  const active = sanctions.filter((s) => !s.liftedAt);
  return (
    <Section title={`Sanctions (${active.length} active)`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <input className="input flex-1" placeholder="0x… wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} />
        <select className="input sm:w-40" value={scope} onChange={(e) => setScope(e.target.value)}>
          {canSiteBan && <option value="SITE_BAN">Site ban</option>}
          <option value="CHAT_BAN">Chat ban</option>
          <option value="CHAT_MUTE">Chat mute</option>
        </select>
        <input className="input sm:w-36" placeholder="Minutes (blank=perm)" value={mins} onChange={(e) => setMins(e.target.value)} />
        <button
          className="btn-accent"
          onClick={async () => {
            await postJson("/api/admin/sanction", {
              action: "create",
              wallet,
              scope,
              durationMinutes: mins ? Number(mins) : null,
            });
            setWallet("");
            onChange();
          }}
        >
          Apply
        </button>
      </div>
      <div className="mt-4">
        {active.length === 0 ? (
          <Empty>No active sanctions.</Empty>
        ) : (
          <Table
            headers={["Wallet", "Scope", "Expires", "Actions"]}
            rows={active.map((s) => [
              <span key="w" className="font-mono">{shortenAddress(s.wallet, 5)}</span>,
              <span key="s">{s.scope}</span>,
              <span key="e">{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : "Permanent"}</span>,
              <button
                key="l"
                className="text-xs text-emerald-300 hover:underline"
                onClick={async () => {
                  await postJson("/api/admin/sanction", { action: "lift", wallet: s.wallet, scope: s.scope });
                  onChange();
                }}
              >
                Lift
              </button>,
            ])}
          />
        )}
      </div>
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
