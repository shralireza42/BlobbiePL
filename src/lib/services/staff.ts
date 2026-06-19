import "server-only";
import { prisma, hasDatabase } from "../prisma";
import { isAdminWallet } from "../env";
import { getSession } from "../auth";
import {
  type StaffRole,
  type Permission,
  hasPermission,
  canManageRole,
  grantableRoles,
} from "../permissions";

/**
 * Resolve a wallet's staff role. Env admin wallets are always OWNER; everyone
 * else is looked up in the Staff table.
 */
export async function getStaffRole(
  wallet: string | null | undefined,
): Promise<StaffRole | null> {
  if (!wallet) return null;
  if (isAdminWallet(wallet)) return "OWNER";
  if (!hasDatabase) return null;
  try {
    const row = await prisma.staff.findUnique({
      where: { wallet: wallet.toLowerCase() },
      select: { role: true },
    });
    return (row?.role as StaffRole) ?? null;
  } catch {
    return null;
  }
}

export type Actor = {
  wallet: string;
  role: StaffRole | null;
  isStaff: boolean;
  permissions: Permission[];
};

const ALL_PERMISSIONS: Permission[] = [
  "VIEW_USERS",
  "REVIEW_AIRDROP",
  "FLAG_FRAUD",
  "CHAT_MODERATE",
  "SITE_BAN",
  "MANAGE_FEATURES",
  "MANAGE_CONFIG",
  "MANAGE_ROLES",
  "RUN_DRAW",
  "EXPORT",
];

export async function getActor(wallet: string | null | undefined): Promise<Actor | null> {
  if (!wallet) return null;
  const role = await getStaffRole(wallet);
  return {
    wallet: wallet.toLowerCase(),
    role,
    isStaff: !!role,
    permissions: role ? ALL_PERMISSIONS.filter((p) => hasPermission(role, p)) : [],
  };
}

/** Throw UNAUTHORIZED unless the session wallet has the given permission. */
export async function requirePermission(perm: Permission): Promise<Actor> {
  const session = getSession();
  const actor = await getActor(session?.wallet);
  if (!actor || !actor.role || !hasPermission(actor.role, perm)) {
    throw new Error("UNAUTHORIZED");
  }
  return actor;
}

/** Throw UNAUTHORIZED unless the session wallet is any staff member. */
export async function requireStaff(): Promise<Actor> {
  const session = getSession();
  const actor = await getActor(session?.wallet);
  if (!actor || !actor.isStaff) throw new Error("UNAUTHORIZED");
  return actor;
}

export async function listStaff() {
  if (!hasDatabase) return [];
  try {
    return await prisma.staff.findMany({ orderBy: { createdAt: "asc" } });
  } catch {
    return [];
  }
}

export async function setStaffRole(args: {
  actorWallet: string;
  targetWallet: string;
  role: StaffRole;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!hasDatabase) return { ok: false, reason: "Database not configured." };
  const actorRole = await getStaffRole(args.actorWallet);
  if (!grantableRoles(actorRole).includes(args.role)) {
    return { ok: false, reason: "You cannot grant that role." };
  }
  const target = args.targetWallet.toLowerCase();
  if (isAdminWallet(target)) {
    return { ok: false, reason: "That wallet is an owner and can't be changed." };
  }
  const existing = await prisma.staff.findUnique({ where: { wallet: target } });
  if (!canManageRole(actorRole, (existing?.role as StaffRole) ?? null)) {
    return { ok: false, reason: "You cannot manage this member." };
  }
  await prisma.staff.upsert({
    where: { wallet: target },
    update: { role: args.role, addedBy: args.actorWallet.toLowerCase() },
    create: { wallet: target, role: args.role, addedBy: args.actorWallet.toLowerCase() },
  });
  return { ok: true };
}

export async function removeStaff(args: {
  actorWallet: string;
  targetWallet: string;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!hasDatabase) return { ok: false, reason: "Database not configured." };
  const actorRole = await getStaffRole(args.actorWallet);
  const target = args.targetWallet.toLowerCase();
  const existing = await prisma.staff.findUnique({ where: { wallet: target } });
  if (!existing) return { ok: true };
  if (!canManageRole(actorRole, existing.role as StaffRole)) {
    return { ok: false, reason: "You cannot manage this member." };
  }
  await prisma.staff.delete({ where: { wallet: target } });
  return { ok: true };
}
