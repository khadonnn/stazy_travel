import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const getHotelPrice = async (id: number | string) => {
  try {
    const hotelId = Number(id);
    if (isNaN(hotelId)) return null;

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        title: true,
        price: true,
        featuredImage: true,
        address: true,
        slug: true,
      },
    });

    if (!hotel) return null;

    return {
      id: hotel.id,
      title: hotel.title,
      price: Number(hotel.price), // Convert Decimal -> Number
      image: hotel.featuredImage,
      address: hotel.address,
      slug: hotel.slug,
    };
  } catch (error) {
    console.error("DB Error:", error);
    return null;
  }
};
