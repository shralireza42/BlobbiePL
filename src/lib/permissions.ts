/**
 * Staff roles + permission matrix (pure, no I/O).
 *
 * OWNER is defined by the ADMIN_WALLET_ADDRESS env (the project owner) and
 * always has every permission. MANAGER / MODERATOR / SENIOR are granted by the
 * owner/managers and stored in the DB.
 */

export type StaffRole = "OWNER" | "MANAGER" | "MODERATOR" | "SENIOR";

export type Permission =
  | "VIEW_USERS"
  | "REVIEW_AIRDROP"
  | "FLAG_FRAUD"
  | "CHAT_MODERATE" // mute/ban in chat + delete messages
  | "SITE_BAN" // ban users from the site
  | "MANAGE_FEATURES" // stop/start draw, airdrop, minigames
  | "MANAGE_CONFIG" // contract addresses, mock price, etc.
  | "MANAGE_ROLES" // grant/revoke staff roles
  | "RUN_DRAW" // manually settle a round
  | "EXPORT"; // CSV export

export const ROLE_RANK: Record<StaffRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  MODERATOR: 2,
  SENIOR: 1,
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  MODERATOR: "Moderator",
  SENIOR: "Senior",
};

const SENIOR_PERMS: Permission[] = ["VIEW_USERS", "REVIEW_AIRDROP", "CHAT_MODERATE"];
const MODERATOR_PERMS: Permission[] = [
  ...SENIOR_PERMS,
  "FLAG_FRAUD",
  "SITE_BAN",
];
const MANAGER_PERMS: Permission[] = [
  ...MODERATOR_PERMS,
  "MANAGE_FEATURES",
  "MANAGE_CONFIG",
  "MANAGE_ROLES",
  "RUN_DRAW",
  "EXPORT",
];
const ALL_PERMS: Permission[] = [...MANAGER_PERMS];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  OWNER: ALL_PERMS, // owner implicitly has everything
  MANAGER: MANAGER_PERMS,
  MODERATOR: MODERATOR_PERMS,
  SENIOR: SENIOR_PERMS,
};

export function hasPermission(
  role: StaffRole | null | undefined,
  perm: Permission,
): boolean {
  if (!role) return false;
  if (role === "OWNER") return true;
  return ROLE_PERMISSIONS[role].includes(perm);
}

/** Roles an actor is allowed to grant (strictly below their own rank). */
export function grantableRoles(actor: StaffRole | null): StaffRole[] {
  if (!actor) return [];
  const rank = ROLE_RANK[actor];
  return (["MANAGER", "MODERATOR", "SENIOR"] as StaffRole[]).filter(
    (r) => ROLE_RANK[r] < rank,
  );
}

/** Can `actor` change/remove a member who currently has `targetRole`? */
export function canManageRole(
  actor: StaffRole | null,
  targetRole: StaffRole | null,
): boolean {
  if (!actor || !hasPermission(actor, "MANAGE_ROLES")) return false;
  // Cannot touch OWNER (env-defined) or peers/superiors.
  if (!targetRole) return true; // assigning to a non-staff wallet
  if (targetRole === "OWNER") return false;
  return ROLE_RANK[actor] > ROLE_RANK[targetRole];
}
