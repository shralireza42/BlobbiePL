"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Blobbie logo. Uses the project avatar at /logo.png if present, otherwise
 * falls back to the bundled SVG recreation. To use the official artwork, drop
 * the file at `public/logo.png` — no code change required.
 */
export function Logo({
  href = "/",
  tone = "ink",
  size = 48,
}: {
  href?: string;
  tone?: "ink" | "cream";
  size?: number;
}) {
  const [src, setSrc] = useState("/logo.png");
  // Inline color/size win over the global `.font-display` color rule.
  // $BLOBBIE: Dela Gothic One regular, 30px, full black (cream on dark footer).
  const stroke = tone === "ink" ? "#000000" : "#e8edda";
  const wordmarkStyle = {
    fontFamily: "var(--font-display)",
    fontWeight: 700 as const,
    fontStyle: "normal" as const,
    fontSize: 30,
    lineHeight: 1,
    color: tone === "ink" ? "#000000" : "#e8edda",
    // Dela Gothic One ships a single weight — thicken the glyphs for a real
    // bold look using a same-color text stroke.
    WebkitTextStroke: `1.1px ${stroke}`,
    paintOrder: "stroke fill" as const,
  };

  return (
    <Link href={href} className="group flex items-center gap-3">
      <span
        className="relative shrink-0 overflow-hidden rounded-full border-2 border-ink bg-paper"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          onError={() => setSrc("/logo.svg")}
          alt="Blobbie"
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </span>
      <span className="tracking-tight" style={wordmarkStyle}>
        $BLOBBIE
      </span>
    </Link>
  );
}
