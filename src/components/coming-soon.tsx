import Link from "next/link";
import { PageShell } from "./page-shell";
import { ComingSoonBadge } from "./ui";
import { ROUTES } from "@/lib/routes";

export function ComingSoon({
  title,
  description,
  glyph = "◇",
}: {
  title: string;
  description: string;
  glyph?: string;
}) {
  return (
    <PageShell>
      <section className="container-px flex min-h-[60vh] items-center justify-center py-16">
        <div className="card relative w-full max-w-xl overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-cyan/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cream/10 bg-cream/5 text-3xl text-neon-cyan">
              {glyph}
            </div>
            <div className="mt-5 flex justify-center">
              <ComingSoonBadge />
            </div>
            <h1 className="mt-4 text-3xl font-extrabold text-cream">{title}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-cream-dim">
              {description}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={ROUTES.playground} className="btn-primary w-full sm:w-auto">
                Back to Playground
              </Link>
              <Link href={ROUTES.dailyDraw} className="btn-ghost w-full sm:w-auto">
                Daily Rewards Draw
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
