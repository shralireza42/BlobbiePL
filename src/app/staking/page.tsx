import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Staking" };

export default function Page() {
  return (
    <ComingSoon
      glyph="⬢"
      title="Staking"
      description="Stake $BLOBBIE to earn passive rewards and boost your Playground perks. Staking contracts are in development and pending audit."
    />
  );
}
