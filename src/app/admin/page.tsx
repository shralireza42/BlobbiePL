import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import { AdminClient } from "@/components/admin/admin-client";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <PageShell>
      <section className="container-px py-12">
        <SectionHeading
          eyebrow="Protected"
          title="Admin"
          subtitle="Configure the Playground, review airdrop activity, and manage anti-sybil controls."
        />
        <div className="mt-8">
          <AdminClient />
        </div>
      </section>
    </PageShell>
  );
}
