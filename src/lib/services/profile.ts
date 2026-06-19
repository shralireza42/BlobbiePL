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
): Promise<{ ok: boolean; error?: string; profile: Profile }> {
  const lowered = wallet.toLowerCase();
  // Empty string clears the field.
  const displayName =
    data.displayName === undefined ? undefined : data.displayName || null;
  const avatarUrl =
    data.avatarUrl === undefined ? undefined : data.avatarUrl || null;

  if (!hasDatabase) {
    return {
      ok: true,
      profile: {
        wallet: lowered,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
        persisted: false,
      },
    };
  }

  const current = await prisma.user.findUnique({
    where: { wallet: lowered },
    select: { displayName: true, avatarUrl: true, displayNameUpdatedAt: true },
  });

  const updateData: Record<string, unknown> = { lastSeenAt: new Date() };

  // Username rules: unique (case-insensitive) + changeable once per 30 days.
  if (displayName !== undefined && displayName !== (current?.displayName ?? null)) {
    if (displayName) {
      const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
      if (
        current?.displayNameUpdatedAt &&
        Date.now() - current.displayNameUpdatedAt.getTime() < MONTH_MS
      ) {
        const next = new Date(current.displayNameUpdatedAt.getTime() + MONTH_MS);
        return {
          ok: false,
          error: `You can change your username once a month. Try again after ${next.toLocaleDateString()}.`,
          profile: {
            wallet: lowered,
            displayName: current.displayName,
            avatarUrl: current.avatarUrl,
            persisted: true,
          },
        };
      }
      const taken = await prisma.user.findFirst({
        where: {
          displayName: { equals: displayName, mode: "insensitive" },
          wallet: { not: lowered },
        },
        select: { id: true },
      });
      if (taken) {
        return {
          ok: false,
          error: "That username is already taken.",
          profile: {
            wallet: lowered,
            displayName: current?.displayName ?? null,
            avatarUrl: current?.avatarUrl ?? null,
            persisted: true,
          },
        };
      }
    }
    updateData.displayName = displayName;
    updateData.displayNameUpdatedAt = new Date();
  }

  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  const user = await prisma.user.upsert({
    where: { wallet: lowered },
    update: updateData,
    create: {
      wallet: lowered,
      displayName: displayName ?? null,
      displayNameUpdatedAt: displayName ? new Date() : null,
      avatarUrl: avatarUrl ?? null,
    },
    select: { displayName: true, avatarUrl: true },
  });

  return {
    ok: true,
    profile: {
      wallet: lowered,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      persisted: true,
    },
  };
}
