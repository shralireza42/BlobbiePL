import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { SectionHeading, Skeleton } from "@/components/ui";
import { VerifyConsole } from "@/components/verify/verify-console";

export const metadata: Metadata = {
  title: "Verify Results",
  description:
    "Enter any Daily Rewards Draw round number to view its participants, status and winners. Results are designed to be on-chain verifiable when live.",
};

export default function VerifyPage() {
  return (
    <PageShell>
      <section className="container-px py-12">
        <SectionHeading
          eyebrow="Transparency"
          title="Verify Round Results"
          subtitle="Enter a round number to inspect its participants, status and winners. When the live contract is deployed, every round is verifiable on BscScan with VRF-compatible randomness."
        />
        <div className="mt-8">
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <VerifyConsole />
          </Suspense>
        </div>
      </section>
    </PageShell>
  );
}
