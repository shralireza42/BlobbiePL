import "server-only";
import { prisma, hasDatabase } from "../prisma";
import type { BugReportInput } from "../validation";

export type SubmitBugResult = {
  ok: boolean;
  id: string | null;
  message: string;
  isMock: boolean;
};

/**
 * Store a bug bounty report. Reports are triaged by the security team — points
 * and payouts are never granted automatically. In Beta Mock Mode (no DB) the
 * submission is accepted but not persisted.
 */
export async function submitBugReport(
  input: BugReportInput,
  context?: { reporterWallet?: string | null; ipHash?: string | null },
): Promise<SubmitBugResult> {
  if (!hasDatabase) {
    return {
      ok: true,
      id: null,
      message:
        "Report received (Beta Mock Mode — not persisted). Configure a database to store reports.",
      isMock: true,
    };
  }

  const report = await prisma.bugReport.create({
    data: {
      title: input.title,
      severity: input.severity,
      category: input.category,
      description: input.description,
      steps: input.steps || null,
      impact: input.impact || null,
      contact: input.contact || null,
      reporterWallet: context?.reporterWallet ?? null,
      rewardWallet: input.rewardWallet ? input.rewardWallet : null,
      ipHash: context?.ipHash ?? null,
    },
  });

  await prisma.activityLog.create({
    data: {
      wallet: context?.reporterWallet ?? null,
      type: "bug_report",
      message: `New ${input.severity} bug report: ${input.title}`,
      metadata: { category: input.category, reportId: report.id },
    },
  });

  return {
    ok: true,
    id: report.id,
    message:
      "Thanks! Your report was submitted. The security team will review it and follow up via your contact.",
    isMock: false,
  };
}

export type BugReportSummary = {
  total: number;
  open: number;
  recent: {
    id: string;
    title: string;
    severity: string;
    category: string;
    status: string;
    description: string;
    steps: string | null;
    impact: string | null;
    contact: string | null;
    rewardWallet: string | null;
    reporterWallet: string | null;
    createdAt: string;
  }[];
};

/** Admin view: counts + recent reports. Resilient if the table is missing. */
export async function getBugReportSummary(limit = 25): Promise<BugReportSummary> {
  if (!hasDatabase) return { total: 0, open: 0, recent: [] };
  try {
    const [total, open, recent] = await Promise.all([
      prisma.bugReport.count(),
      prisma.bugReport.count({
        where: { status: { in: ["NEW", "TRIAGED", "ACCEPTED"] } },
      }),
      prisma.bugReport.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);
    return {
      total,
      open,
      recent: recent.map((r) => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        category: r.category,
        status: r.status,
        description: r.description,
        steps: r.steps,
        impact: r.impact,
        contact: r.contact,
        rewardWallet: r.rewardWallet,
        reporterWallet: r.reporterWallet,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch {
    return { total: 0, open: 0, recent: [] };
  }
}
