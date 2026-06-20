import Link from "next/link";
import { Logo } from "./logo";
import { ROUTES } from "@/lib/routes";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-cream/10 bg-bg-soft">
      <div className="container-px grid gap-8 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo tone="cream" />
          <h6 className="text-sm text-cream-dim">
            A Web3 reward ecosystem on BNB Chain powered by the $BLOBBIE BEP-20
            token.
          </h6>
        </div>
        <FooterCol
          title="Explore"
          links={[
            { href: ROUTES.dailyDraw, label: "Daily Rewards Draw" },
            { href: ROUTES.airdrop, label: "Airdrop Hub" },
            { href: ROUTES.referrals, label: "Referrals" },
            { href: ROUTES.dashboard, label: "Dashboard" },
            { href: ROUTES.verify, label: "Verify Results" },
            { href: ROUTES.bugBounty, label: "Bug Bounty" },
          ]}
        />
        <FooterCol
          title="Coming Soon"
          links={[
            { href: ROUTES.dash, label: "Blobbie Dash" },
            { href: ROUTES.blast, label: "Blobbie Blast" },
            { href: ROUTES.stack, label: "Blobbie Stack" },
            { href: ROUTES.staking, label: "Staking" },
          ]}
        />
        <div className="space-y-3 text-sm">
          <p className="font-display not-italic text-cream">Network</p>
          <h6 className="text-cream-dim">Built on BNB Chain</h6>
          <h6 className="text-cream-dim">BEP-20 · $BLOBBIE</h6>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="container-px flex flex-col gap-2 py-6 text-xs not-italic text-cream-dim sm:flex-row sm:items-center sm:justify-between">
          <h6>© {new Date().getFullYear()} Blobbie. Playground Beta.</h6>
          <h6 className="max-w-xl">
            Disclaimer: Participation involves risk. This is not financial advice
            and rewards are not guaranteed. Beta features may run in mock mode.
          </h6>
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
      <p className="font-display not-italic text-cream">{title}</p>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="not-italic text-cream-dim transition hover:text-cream"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
