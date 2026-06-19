import { ReactNode } from "react";

export function BetaBadge({ label = "Beta Mock Mode" }: { label?: string }) {
  return (
    <span className="chip border-accent-lime/40 bg-accent-lime/10 text-accent-lime">
      <span className="h-1.5 w-1.5 rounded-full bg-accent-lime animate-pulse-glow" />
      {label}
    </span>
  );
}

export function ActiveBadge({ children = "Active" }: { children?: ReactNode }) {
  return (
    <span className="chip border-accent-green/40 bg-accent-green/10 text-accent-green">
      <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
      {children}
    </span>
  );
}

export function ComingSoonBadge() {
  return (
    <span className="chip border-cream/20 bg-bg/60 text-cream-dim backdrop-blur">
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
        <p className="font-display text-xs font-normal not-italic uppercase tracking-[0.25em] text-accent-lime">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-display not-italic sm:text-4xl">{title}</h2>
      {subtitle && (
        <h6 className="max-w-2xl text-sm text-cream-dim">{subtitle}</h6>
      )}
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
      <p className="mt-1 text-xl font-display not-italic">{value}</p>
      {hint && <p className="mt-0.5 text-xs not-italic text-cream-dim">{hint}</p>}
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
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-cream/15 bg-cream/5 text-2xl">
        ◇
      </div>
      <p className="font-display not-italic text-cream">{title}</p>
      {description && <h6 className="text-sm text-cream-dim">{description}</h6>}
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-cream/10 bg-cream/5 p-4 text-xs not-italic text-cream-dim">
      {children}
    </div>
  );
}
