import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Free Daily Entries" };

export default function Page() {
  return (
    <ComingSoon
      glyph="🎁"
      title="Free Daily Entries"
      description="Earn Daily Rewards Draw entries through community tasks — no purchase required. This module funds from the dedicated pool allocation. Coming soon."
    />
  );
}
