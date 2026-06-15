import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Referrals" };

export default function Page() {
  return (
    <ComingSoon
      glyph="⇄"
      title="Referrals"
      description="Invite friends and earn free entries when they join the Daily Rewards Draw. The referral module is in development."
    />
  );
}
