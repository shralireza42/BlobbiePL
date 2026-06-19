import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { AutoTask } from "@/hooks/useAutoTask";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Your Blobbie dashboard — $BLOBBIE balance, Daily Rewards Draw tickets, Airdrop Points and recent activity.",
};

export default function DashboardPage() {
  return (
    <PageShell>
      <AutoTask taskKey="join_playground" />
      <section className="container-px py-12">
        <SectionHeading
          eyebrow="Your Account"
          title="Dashboard"
          subtitle="A unified view of your Daily Rewards Draw participation and Airdrop Points."
        />
        <div className="mt-8">
          <DashboardClient />
        </div>
      </section>
    </PageShell>
  );
}
