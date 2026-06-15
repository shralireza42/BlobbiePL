import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Blobbie Dash" };

export default function Page() {
  return (
    <ComingSoon
      glyph="⚡"
      title="Blobbie Dash"
      description="An endless neon runner mini-game with on-chain scores and Airdrop Point rewards. Launching in a future Playground update."
    />
  );
}
