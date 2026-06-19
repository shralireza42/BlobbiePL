import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import { AirdropConsole } from "@/components/airdrop/airdrop-console";
import { AutoTask } from "@/hooks/useAutoTask";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Airdrop Hub",
  description:
    "Complete Blobbie beta actions to earn Airdrop Points. Points track contribution — final rewards are admin-reviewed and anti-sybil checked.",
};

export default function AirdropPage() {
  return (
    <PageShell>
      <AutoTask taskKey="connect_wallet" />
      <section className="container-px py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            eyebrow="Active Beta Module"
            title="Airdrop Hub"
            subtitle="Earn Airdrop Points for contributing to the beta. Points do not guarantee token rewards."
          />
          {config.isMockMode && (
            <span className="chip border-gold/30 bg-gold/10 text-gold">
              Beta Mock Mode
            </span>
          )}
        </div>

        <div className="mt-8">
          <AirdropConsole />
        </div>
      </section>
    </PageShell>
  );
}
