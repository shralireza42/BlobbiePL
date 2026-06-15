import { ReactNode } from "react";

export function BetaBadge({ label = "Beta Mock Mode" }: { label?: string }) {
  return (
    <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-300">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse-glow" />
      {label}
    </span>
  );
}

export function ActiveBadge({ children = "Active" }: { children?: ReactNode }) {
  return (
    <span className="chip border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {children}
    </span>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="chip border-white/15 bg-white/5 text-slate-400">
      Coming Soon
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      {subtitle && <p className="max-w-2xl text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="card p-4">
      <p className="stat-label">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl">
        ◇
      </div>
      <p className="font-semibold text-white">{title}</p>
      {description && <p className="text-sm text-slate-400">{description}</p>}
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
      {children}
    </div>
  );
}
