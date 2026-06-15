import Link from "next/link";

/**
 * Blobbie wordmark + mark. Logo sizing tuned to match the itsblobbie.com header
 * (mark ~40px, wordmark in the Dela Gothic display face).
 */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-cream">
        <span className="h-4 w-4 rounded-full bg-bg" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent-lime" />
      </span>
      <span className="font-display text-2xl not-italic tracking-tight text-cream">
        BLOBBIE
      </span>
    </Link>
  );
}
