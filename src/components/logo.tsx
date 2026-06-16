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
  size = 40,
}: {
  href?: string;
  tone?: "ink" | "cream";
  size?: number;
}) {
  const [src, setSrc] = useState("/logo.png");
  const wordmark = tone === "ink" ? "text-ink" : "text-cream";

  return (
    <Link href={href} className="group flex items-center gap-2.5">
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
      <span className={`font-display text-xl not-italic tracking-tight ${wordmark}`}>
        $BLOBBIE
      </span>
    </Link>
  );
}
