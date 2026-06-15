import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Blobbie NFTs" };

export default function Page() {
  return (
    <ComingSoon
      glyph="◈"
      title="Blobbie NFTs"
      description="Collectible Blobbie characters with utility across the Playground. The NFT collection launch is on the roadmap. Coming soon."
    />
  );
}
