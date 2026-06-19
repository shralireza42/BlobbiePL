import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CAMPAIGN_SLUG = "blobbie-beta";

const AIRDROP_TASKS = [
  { key: "connect_wallet", title: "Connect Wallet", description: "Connect a BNB Chain wallet to the Blobbie Playground.", points: 50, type: "ONE_TIME", status: "ACTIVE", requiresAdmin: false, sortOrder: 1 },
  { key: "join_playground", title: "Join Playground", description: "Enter the Blobbie Playground hub for the first time.", points: 50, type: "ONE_TIME", status: "ACTIVE", requiresAdmin: false, sortOrder: 2 },
  { key: "view_daily_draw", title: "View Daily Rewards Draw", description: "Open the Daily Rewards Draw and review the current round.", points: 30, type: "ONE_TIME", status: "ACTIVE", requiresAdmin: false, sortOrder: 3 },
  { key: "buy_ticket", title: "Buy a Daily Rewards Draw Ticket", description: "Purchase at least one ticket in an open round.", points: 100, type: "ONE_TIME", status: "ACTIVE", requiresAdmin: false, sortOrder: 4 },
  { key: "return_daily", title: "Return Daily", description: "Check in once every 24 hours to keep your streak.", points: 20, type: "DAILY", status: "ACTIVE", requiresAdmin: false, sortOrder: 5 },
  { key: "referral", title: "Invite a Friend", description: "Referral rewards arrive with the Referrals module.", points: 0, type: "MANUAL", status: "COMING_SOON", requiresAdmin: true, sortOrder: 6 },
  { key: "minigames", title: "Play a Mini-Game", description: "Blobbie Dash, Blast & Stack arrive soon.", points: 0, type: "MANUAL", status: "COMING_SOON", requiresAdmin: true, sortOrder: 7 },
  // Social tasks (verified via X OAuth / Telegram). Points are env-configurable.
  { key: "follow_x", title: "Follow @xBlobbie on X", description: "Connect your X account and follow @xBlobbie to verify.", points: Number(process.env.AIRDROP_X_FOLLOW_POINTS) || 100, type: "ONE_TIME", status: "ACTIVE", requiresAdmin: true, sortOrder: 20 },
  { key: "join_telegram", title: "Join the Blobbie Telegram", description: "Connect Telegram and join the official channel to verify.", points: Number(process.env.AIRDROP_TELEGRAM_JOIN_POINTS) || 75, type: "ONE_TIME", status: "ACTIVE", requiresAdmin: true, sortOrder: 21 },
  { key: "bonus_social", title: "Social Bonus", description: "Complete both social tasks to unlock a one-time bonus.", points: Number(process.env.AIRDROP_BONUS_SOCIAL_POINTS) || 50, type: "ONE_TIME", status: "ACTIVE", requiresAdmin: true, sortOrder: 22 },
] as const;

async function main() {
  const campaign = await prisma.airdropCampaign.upsert({
    where: { slug: DEFAULT_CAMPAIGN_SLUG },
    update: { name: "Blobbie Beta Airdrop" },
    create: {
      slug: DEFAULT_CAMPAIGN_SLUG,
      name: "Blobbie Beta Airdrop",
      description: "Earn Airdrop Points for beta contributions.",
    },
  });

  for (const task of AIRDROP_TASKS) {
    await prisma.airdropTask.upsert({
      where: { campaignId_key: { campaignId: campaign.id, key: task.key } },
      update: {
        title: task.title,
        description: task.description,
        points: task.points,
        type: task.type as never,
        status: task.status as never,
        requiresAdmin: task.requiresAdmin,
        sortOrder: task.sortOrder,
      },
      create: {
        campaignId: campaign.id,
        key: task.key,
        title: task.title,
        description: task.description,
        points: task.points,
        type: task.type as never,
        status: task.status as never,
        requiresAdmin: task.requiresAdmin,
        sortOrder: task.sortOrder,
      },
    });
  }

  console.log(`Seeded campaign "${campaign.slug}" with ${AIRDROP_TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
