import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Blobbie Blast" };

export default function Page() {
  return (
    <ComingSoon
      glyph="✸"
      title="Blobbie Blast"
      description="An arcade blaster with on-chain leaderboards. Compete for Airdrop Points and seasonal rewards. Coming soon."
    />
  );
}
