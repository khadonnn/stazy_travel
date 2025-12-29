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
    // 1. Lấy User ID từ Clerk Token
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
        // 2. Lấy thông tin Hotel (Chỉ cần lấy trường userId chủ sở hữu)
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { 
                authorId: true 
            } 
        });

        if (!hotel) {
            return res.status(404).json({ message: 'Hotel not found!' });
        }

        // 3. Check Admin (Quyền lực tối cao - cho qua luôn)
        const claims = auth.sessionClaims as CustomJwtSessionClaims;
        if (claims?.metadata?.role === 'admin') {
            return next();
        }

        // 4. Check Owner (So sánh trực tiếp)
        // Vì User ID trong DB = Clerk ID, nên so sánh chuỗi là xong.
        if (hotel.authorId !== clerkUserId) {
            return res.status(403).json({ message: 'Forbidden: You do not own this hotel!' });
        }

        // 5. Nếu trùng khớp -> Cho qua
        return next();

    } catch (error) {
        console.error('Auth Middleware Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};
