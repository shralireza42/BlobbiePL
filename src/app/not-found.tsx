import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <PageShell>
      <section className="container-px flex min-h-[60vh] items-center justify-center py-16">
        <div className="text-center">
          <p className="neon-text text-6xl font-extrabold">404</p>
          <h1 className="mt-4 text-2xl font-bold text-white">Page not found</h1>
          <p className="mt-2 text-sm text-slate-400">
            This Blobbie route does not exist yet.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href={ROUTES.home} className="btn-primary">
              Home
            </Link>
            <Link href={ROUTES.playground} className="btn-ghost">
              Playground
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
