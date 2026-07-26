// ── Database Seeder ────────────────────────────────────────────────────────
// Creates initial subscription plans and a demo user for development.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱  Seeding database...");

  // ── Subscription Plans ──────────────────────────────────────────────────
  const plans = [
    { name: "7 Days", price: 10000, durationDays: 7, maxDevices: 2, active: true },
    { name: "30 Days", price: 30000, durationDays: 30, maxDevices: 3, active: true },
    { name: "90 Days", price: 75000, durationDays: 90, maxDevices: 5, active: true },
    { name: "365 Days", price: 250000, durationDays: 365, maxDevices: 10, active: true },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.name.toLowerCase().replace(/\s+/g, "-") },
      update: plan,
      create: {
        id: plan.name.toLowerCase().replace(/\s+/g, "-"),
        ...plan,
      },
    });
  }

  console.log(`✅  Created ${plans.length} subscription plans`);

  // ── Demo User ───────────────────────────────────────────────────────────
  const demoEmail = "demo@hfzbot.cloud";
  const existingUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!existingUser) {
    const password = await bcrypt.hash("demo1234", 12);

    await prisma.user.create({
      data: {
        name: "Demo User",
        email: demoEmail,
        password,
        emailVerifiedAt: new Date(),
      },
    });

    console.log("✅  Created demo user: demo@hfzbot.cloud / demo1234");
  }

  // ── Demo Bot ────────────────────────────────────────────────────────────
  const demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (demoUser) {
    const existingBot = await prisma.bot.findUnique({
      where: { userId: demoUser.id },
    });

    if (!existingBot) {
      // Create a demo subscription for the demo user
      const sevenDayPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: "7-days" },
      });

      if (sevenDayPlan) {
        await prisma.subscription.create({
          data: {
            userId: demoUser.id,
            planId: sevenDayPlan.id,
            status: "ACTIVE",
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        console.log("✅  Created demo subscription (7 days)");
      }

      await prisma.bot.create({
        data: {
          userId: demoUser.id,
          name: "Demo Bot",
          status: "ONLINE",
          phoneNumber: "6281234567890",
        },
      });

      console.log("✅  Created demo bot: Demo Bot");
    }

    // Create sample groups for the demo bot
    const demoBot = await prisma.bot.findUnique({
      where: { userId: demoUser.id },
    });

    if (demoBot) {
      const groupJids = [
        "6281234567890-1612345678@g.us",
        "6281234567890-1612345679@g.us",
        "6281234567890-1612345680@g.us",
      ];

      for (const jid of groupJids) {
        const existingGroup = await prisma.group.findUnique({
          where: { groupJid: jid },
        });

        if (!existingGroup) {
          await prisma.group.create({
            data: {
              botId: demoBot.id,
              groupJid: jid,
              groupName: `Demo Group ${groupJids.indexOf(jid) + 1}`,
              memberCount: Math.floor(Math.random() * 50) + 10,
            },
          });
        }
      }

      console.log("✅  Created demo groups (3)");
    }
  }

  console.log("🎉  Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌  Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
