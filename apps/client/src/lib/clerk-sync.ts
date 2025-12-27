import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@repo/product-db';

export async function syncUserToDB() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;
    const rawEmail = clerkUser.emailAddresses[0]?.emailAddress;


    if (!rawEmail) {
      return null; 
    }

    const firstName = clerkUser.firstName ?? "";
    const lastName = clerkUser.lastName ?? "";
    
    let name = `${firstName} ${lastName}`.trim();
    if (!name) {
        name = rawEmail.split('@')[0] as string; 
    }

    // 3. Xử lý Avatar
    const image = clerkUser.imageUrl;

    // 4. Upsert
    const user = await prisma.user.upsert({
      where: { id: clerkUser.id },
      update: {
        email: rawEmail, 
        name: name,      
        avatar: image,
        updatedAt: new Date(),
      },
      create: {
        id: clerkUser.id,
        email: rawEmail, 
        name: name,      
        avatar: image,
        role: 'USER', 
        password: '', 
      },
    });

    return user;
  } catch (error) {
    console.error("❌ Lỗi đồng bộ User:", error);
    return null;
  }
}