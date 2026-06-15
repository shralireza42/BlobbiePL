import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 group">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan via-neon-blue to-neon-purple shadow-neon">
        <span className="h-4 w-4 rounded-full bg-bg/90" />
        <span className="absolute inset-0 rounded-xl opacity-0 blur-md transition group-hover:opacity-70 bg-gradient-to-br from-neon-cyan to-neon-purple" />
      </span>
      <span className="text-lg font-extrabold tracking-tight">
        <span className="neon-text">BLOBBIE</span>
      </span>
    </Link>
  );
}
