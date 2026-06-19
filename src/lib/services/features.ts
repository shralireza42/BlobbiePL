import "server-only";
import { prisma, hasDatabase } from "../prisma";

/**
 * Site-wide feature kill switches, backed by AppConfig. Default ON. Admins with
 * MANAGE_FEATURES can stop/start the Daily Rewards Draw, Airdrop, and Mini-games.
 */

export type Features = {
  drawEnabled: boolean;
  airdropEnabled: boolean;
  minigamesEnabled: boolean;
  ticketPurchaseEnabled: boolean;
};

const KEYS = {
  drawEnabled: "feature.draw",
  airdropEnabled: "feature.airdrop",
  minigamesEnabled: "feature.minigames",
  ticketPurchaseEnabled: "feature.ticketPurchase",
} as const;

export async function getFeatures(): Promise<Features> {
  const defaults: Features = {
    drawEnabled: true,
    airdropEnabled: true,
    minigamesEnabled: true,
    ticketPurchaseEnabled: true,
  };
  if (!hasDatabase) return defaults;
  try {
    const rows = await prisma.appConfig.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const read = (k: string, d: boolean) =>
      map[k] === undefined ? d : map[k] !== "false";
    return {
      drawEnabled: read(KEYS.drawEnabled, true),
      airdropEnabled: read(KEYS.airdropEnabled, true),
      minigamesEnabled: read(KEYS.minigamesEnabled, true),
      ticketPurchaseEnabled: read(KEYS.ticketPurchaseEnabled, true),
    };
  } catch {
    return defaults;
  }
}

export async function setFeature(
  feature: keyof Features,
  enabled: boolean,
  by: string,
): Promise<void> {
  if (!hasDatabase) return;
  const key = KEYS[feature];
  await prisma.appConfig.upsert({
    where: { key },
    update: { value: String(enabled), updatedBy: by },
    create: { key, value: String(enabled), updatedBy: by },
  });
}
