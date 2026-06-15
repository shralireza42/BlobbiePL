import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Blobbie Vault Burst" };

export default function Page() {
  return (
    <ComingSoon
      glyph="❖"
      title="Blobbie Vault Burst"
      description="A progressive jackpot vault funded partly by the Daily Rewards Draw allocation. Provably fair and VRF-compatible when live. Coming soon."
    />
  );
}
