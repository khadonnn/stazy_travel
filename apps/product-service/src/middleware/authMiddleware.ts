import { getAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { CustomJwtSessionClaims } from '@repo/types';
import { prisma } from '@repo/product-db'; // <-- Import Prisma Client

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

// 1. Kiểm tra đăng nhập
export const shouldBeUser = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const auth = getAuth(req);
    const userId = auth.userId;

    if (!userId) {
        return res.status(401).json({ message: 'You are not logged in!' });
    }

    req.userId = auth.userId;
    return next();
};

// 2. Kiểm tra quyền Admin
export const shouldBeAdmin = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const auth = getAuth(req);
    const userId = auth.userId;

    if (!userId) {
        return res.status(401).json({ message: 'You are not logged in!' });
    }

    const claims = auth.sessionClaims as CustomJwtSessionClaims;

    if (claims.metadata?.role !== 'admin') {
        return res.status(403).send({ message: 'Unauthorized! Admin only.' });
    }

    req.userId = auth.userId;
    return next();
};

// 3. (MỚI) Kiểm tra quyền sở hữu Hotel (Hoặc Admin)
export const shouldBeHotelOwner = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;

    if (!clerkUserId) {
        return res.status(401).json({ message: 'You are not logged in!' });
    }

    const hotelId = Number(req.params.id);
    if (isNaN(hotelId)) {
        return res.status(400).json({ message: 'Invalid Hotel ID' });
    }

    try {
        // A. Lấy thông tin Hotel và Author của nó từ DB
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            include: { author: true }, // Include bảng User để check thông tin
        });

        if (!hotel) {
            return res.status(404).json({ message: 'Hotel not found!' });
        }

        // B. Kiểm tra Admin (Admin luôn có quyền sửa/xóa tất cả)
        const claims = auth.sessionClaims as CustomJwtSessionClaims;
        if (claims.metadata?.role === 'admin') {
            return next();
        }

        // C. Kiểm tra quyền sở hữu (Ownership)
        // Trường hợp 1: Nếu trong bảng User bạn có lưu `clerkId`
        // (Giả sử bảng User có trường clerkId lưu string của Clerk)
        /* if (hotel.author.clerkId !== clerkUserId) {
         return res.status(403).json({ message: "You are not the owner!" });
       }
    */

        // Trường hợp 2: Nếu bạn chưa có trường clerkId, ta so sánh Email (nếu email đồng bộ)
        // Hoặc nếu bạn dùng bảng User tạm thời, bạn phải tìm User trong DB ứng với clerkUserId này

        // --> GIẢI PHÁP TỐT NHẤT: Tìm User trong DB đang giữ Clerk ID này
        const currentUser = await prisma.user.findUnique({
            where: {
                // Lưu ý: Schema User của bạn CẦN có trường email hoặc clerkId map với Clerk
                email: claims.email, // Hoặc clerkId: clerkUserId
            },
        });

        if (!currentUser || hotel.authorId !== currentUser.id) {
            return res
                .status(403)
                .json({ message: 'Forbidden: You do not own this hotel!' });
        }

        // Nếu khớp, cho phép đi tiếp
        return next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
