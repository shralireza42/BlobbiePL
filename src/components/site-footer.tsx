import Link from "next/link";
import { Logo } from "./logo";
import { ROUTES } from "@/lib/routes";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-bg-soft/60">
      <div className="container-px grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-slate-400">
            A Web3 reward ecosystem on BNB Chain powered by the $BLOBBIE BEP-20
            token.
          </p>
        </div>
        <FooterCol
          title="Playground"
          links={[
            { href: ROUTES.playground, label: "Hub" },
            { href: ROUTES.dailyDraw, label: "Daily Rewards Draw" },
            { href: ROUTES.airdrop, label: "Airdrop Hub" },
            { href: ROUTES.dashboard, label: "Dashboard" },
          ]}
        />
        <FooterCol
          title="Coming Soon"
          links={[
            { href: ROUTES.dash, label: "Blobbie Dash" },
            { href: ROUTES.staking, label: "Staking" },
            { href: ROUTES.referrals, label: "Referrals" },
            { href: ROUTES.nfts, label: "Blobbie NFTs" },
          ]}
        />
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-white">Network</p>
          <p className="text-slate-400">Built on BNB Chain</p>
          <p className="text-slate-400">BEP-20 · $BLOBBIE</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-px flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Blobbie. Playground Beta.</p>
          <p className="max-w-xl">
            Disclaimer: Participation involves risk. This is not financial advice
            and rewards are not guaranteed. Beta features may run in mock mode.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold text-white">{title}</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-slate-400 transition hover:text-neon-cyan">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
