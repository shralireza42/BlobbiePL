import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SectionHeading } from "@/components/ui";
import { BugReportForm } from "@/components/bug-bounty/report-form";

export const metadata: Metadata = {
  title: "Bug Bounty",
  description:
    "Help keep Blobbie safe. Report security vulnerabilities in the Daily Rewards Draw, Airdrop Hub, smart contracts, web app and APIs — and earn rewards starting at $100.",
};

const TIERS = [
  {
    severity: "Low",
    reward: "$100 – $250",
    color: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    examples:
      "Reflected XSS requiring heavy interaction, minor information disclosure, missing security headers with realistic impact, open redirects.",
  },
  {
    severity: "Medium",
    reward: "$250 – $500",
    color: "border-gold/40 bg-gold/10 text-gold",
    examples:
      "Stored XSS, IDOR exposing other users' data, bypassing rate limits or anti-spam, claiming airdrop points without completing tasks.",
  },
  {
    severity: "High",
    reward: "$500 – $1,000",
    color: "border-orange-400/40 bg-orange-400/10 text-orange-300",
    examples:
      "Manipulating draw outcomes or randomness, awarding prizes/points to ineligible wallets, privilege escalation to admin actions, account takeover.",
  },
  {
    severity: "Critical",
    reward: "$1,000 – $5,000+",
    color: "border-rose-400/40 bg-rose-400/10 text-rose-300",
    examples:
      "Direct theft or permanent freezing of user funds, draining the prize pool, minting/inflating $BLOBBIE, signature/auth bypass granting wallet control.",
  },
];

const IN_SCOPE = [
  "The Daily Rewards Draw flow (rounds, tickets, winner selection, prize claims)",
  "The Airdrop Hub (points, tasks, social verification, leaderboard)",
  "Referrals, dashboard and admin authorization logic",
  "Wallet signature login / session handling",
  "Public API routes under /api/*",
  "$BLOBBIE token and draw smart contracts once their addresses are published",
];

const OUT_OF_SCOPE = [
  "Denial of service (DoS/DDoS) and volumetric attacks",
  "Spam, social engineering or phishing of staff/users",
  "Attacks requiring physical access or a rooted/compromised device",
  "Reports from automated scanners without a working proof of concept",
  "Best-practice suggestions with no demonstrable security impact",
  "Vulnerabilities in third-party services, libraries or wallets we don't control",
  "Clickjacking on pages with no sensitive state-changing actions",
  "Self-XSS and issues only exploitable against yourself",
];

const RULES = [
  "Only test against your own accounts and wallets. Never access, modify or destroy other users' data.",
  "No DoS, spam, or automated high-volume testing against production.",
  "Give us a reasonable time to investigate and fix before any public disclosure.",
  "Do not exploit beyond what is necessary to prove the issue (e.g. stop at a small proof-of-concept).",
  "One vulnerability per report. The first reporter of a unique, valid issue is eligible for a reward.",
  "Rewards are paid in $BLOBBIE (or stablecoin equivalent) to a BNB Chain wallet you provide.",
];

export default function BugBountyPage() {
  return (
    <PageShell>
      <section className="container-px py-12">
        <SectionHeading
          eyebrow="Security"
          title="Blobbie Bug Bounty"
          subtitle="We take the safety of the Blobbie ecosystem seriously. If you find a security vulnerability, report it responsibly and earn a reward — payouts start at $100 and scale with severity and impact."
        />

        {/* Reward tiers */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <div key={t.severity} className="card p-5">
              <span className={`chip ${t.color}`}>{t.severity}</span>
              <p className="mt-3 font-display not-italic text-2xl text-cream">
                {t.reward}
              </p>
              <p className="mt-2 text-sm text-cream-dim">{t.examples}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-cream-dim">
          Reward ranges are guidelines. Final amounts are decided case-by-case
          based on severity, exploitability, impact and report quality.
          Exceptional smart-contract findings may be rewarded above these ranges.
        </p>

        {/* Scope */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-display not-italic text-lg text-cream">In scope</h3>
            <ul className="mt-4 space-y-2 text-sm text-cream-dim">
              {IN_SCOPE.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="font-display not-italic text-lg text-cream">
              Out of scope
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-cream-dim">
              {OUT_OF_SCOPE.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-rose-400">✕</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Rules + Safe harbor */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-display not-italic text-lg text-cream">
              Rules of engagement
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-cream-dim">
              {RULES.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-gold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h3 className="font-display not-italic text-lg text-cream">
              Safe harbor &amp; disclosure
            </h3>
            <div className="mt-4 space-y-3 text-sm text-cream-dim">
              <p>
                We will not pursue legal action against researchers who act in
                good faith and follow these rules: testing only their own
                accounts, avoiding privacy violations and service disruption,
                and disclosing responsibly.
              </p>
              <p>
                Report privately through the form below. Please keep findings
                confidential until we&apos;ve shipped a fix and agreed on a
                disclosure timeline (typically within 90 days).
              </p>
              <p>
                Questions? Reach the team on Telegram{" "}
                <a
                  className="text-gold underline"
                  href="https://t.me/itsBlobbie"
                  target="_blank"
                  rel="noreferrer"
                >
                  @itsBlobbie
                </a>{" "}
                or X{" "}
                <a
                  className="text-gold underline"
                  href="https://x.com/xBlobbie"
                  target="_blank"
                  rel="noreferrer"
                >
                  @xBlobbie
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Report form */}
        <div className="mt-10">
          <SectionHeading
            eyebrow="Report"
            title="Submit a vulnerability"
            subtitle="The more detail and a clear proof-of-concept you provide, the faster we can validate and reward your report."
          />
          <div className="mt-6 max-w-3xl">
            <BugReportForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
