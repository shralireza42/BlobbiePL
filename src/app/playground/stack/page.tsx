import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Blobbie Stack" };

export default function Page() {
  return (
    <ComingSoon
      glyph="▣"
      title="Blobbie Stack"
      description="Stack blocks, stack rewards. A precision stacking mini-game that ties into the Blobbie reward ecosystem. Coming soon."
    />
  );
}
