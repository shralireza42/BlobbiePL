import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import { ReferralPanel } from "@/components/referral-panel";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Referrals",
  description:
    "Invite friends to Blobbie. When they join and verify their wallet, you both earn Airdrop Points.",
};

export default function ReferralsPage() {
  return (
    <PageShell>
      <section className="container-px py-12">
        <SectionHeading
          eyebrow="Active"
          title="Referrals"
          subtitle="Share your link — you and every friend who joins both earn Airdrop Points."
        />
        <div className="mt-8 space-y-6">
          <ReferralPanel />
          <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
            <p className="text-sm not-italic text-cream-dim">
              Points show up in your Airdrop Hub and raise your level.
            </p>
            <div className="flex gap-2">
              <Link href={ROUTES.airdrop} className="btn-ghost">
                Airdrop Hub
              </Link>
              <Link href={ROUTES.dashboard} className="btn-ghost">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
