import { prisma } from "@repo/product-db";

/**
 * Ensure user exists in database before creating related entities
 * Returns existing user or creates new one based on authorId
 */
export async function ensureUserExists(
  userId: string,
  userEmail?: string,
  userName?: string,
) {
  try {
    // Step 1: Find by ID
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      console.log("✅ User exists:", user.id);
      return user;
    }

    // Step 2: If not found, create minimal user record
    const email = userEmail || `${userId}@placeholder.local`;
    const name = userName || "Author User";

    user = await prisma.user.create({
      data: {
        id: userId,
        email,
        name,
        role: "AUTHOR", // Default role for hotel creators
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Created user:", user.id);
    return user;
  } catch (error: any) {
    // If email already exists, try to update the user ID
    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      console.log("⚠️ Email exists, finding user by email...");
      const user = await prisma.user.findUnique({
        where: { email: userEmail || `${userId}@placeholder.local` },
      });

      if (user) {
        return user;
      }
    }

    console.error("❌ Failed to ensure user exists:", error);
    throw new Error(`Failed to ensure user exists: ${error.message}`);
  }
}
