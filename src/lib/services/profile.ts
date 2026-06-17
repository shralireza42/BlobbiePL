import "server-only";
import { prisma, hasDatabase } from "../prisma";
import type { ProfileUpdateInput } from "../validation";

export type Profile = {
  wallet: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** True when the profile is persisted server-side (DB configured). */
  persisted: boolean;
};

export async function getProfile(wallet: string): Promise<Profile> {
  const lowered = wallet.toLowerCase();
  if (!hasDatabase) {
    return { wallet: lowered, displayName: null, avatarUrl: null, persisted: false };
  }
  try {
    const user = await prisma.user.findUnique({
      where: { wallet: lowered },
      select: { displayName: true, avatarUrl: true },
    });
    return {
      wallet: lowered,
      displayName: user?.displayName ?? null,
      avatarUrl: user?.avatarUrl ?? null,
      persisted: true,
    };
  } catch {
    return { wallet: lowered, displayName: null, avatarUrl: null, persisted: false };
  }
}

export async function updateProfile(
  wallet: string,
  data: ProfileUpdateInput,
): Promise<Profile> {
  const lowered = wallet.toLowerCase();
  // Empty string clears the field.
  const displayName =
    data.displayName === undefined ? undefined : data.displayName || null;
  const avatarUrl =
    data.avatarUrl === undefined ? undefined : data.avatarUrl || null;

  if (!hasDatabase) {
    return {
      wallet: lowered,
      displayName: displayName ?? null,
      avatarUrl: avatarUrl ?? null,
      persisted: false,
    };
  }

  const user = await prisma.user.upsert({
    where: { wallet: lowered },
    update: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      lastSeenAt: new Date(),
    },
    create: {
      wallet: lowered,
      displayName: displayName ?? null,
      avatarUrl: avatarUrl ?? null,
    },
    select: { displayName: true, avatarUrl: true },
  });

  return {
    wallet: lowered,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    persisted: true,
  };
}
