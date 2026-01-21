/**
 * Script để đồng bộ role từ PostgreSQL lên Clerk cho tất cả users
 *
 * Chạy script này một lần khi setup hệ thống role lần đầu
 * hoặc khi cần sync lại data
 *
 * Usage:
 * node --loader tsx apps/client/src/scripts/sync-roles.ts
 */

import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@repo/product-db";

async function syncAllRoles() {
  console.log("🚀 Starting role synchronization...");

  try {
    // Lấy tất cả users từ database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    console.log(`📊 Found ${users.length} users to sync`);

    let successCount = 0;
    let errorCount = 0;

    const client = await clerkClient();

    // Sync từng user
    for (const user of users) {
      try {
        await client.users.updateUser(user.id, {
          publicMetadata: {
            role: user.role,
          },
        });

        console.log(`✅ Synced ${user.email} → ${user.role}`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Error syncing ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n📈 Synchronization Summary:");
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${users.length}`);
  } catch (error) {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
syncAllRoles()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
