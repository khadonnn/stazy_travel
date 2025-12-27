// interactions.controller.ts
import { Request, Response } from 'express';
// Đảm bảo prisma đã được export đúng từ package db
import { prisma } from '@repo/product-db'; 

export const trackInteraction = async (req: Request, res: Response) => {
    try {
        const { userId, hotelId, action } = req.body;

        // 1. Validate đầu vào cơ bản
        if (!userId || !hotelId || !action) {
            return res.status(400).json({ message: "Thiếu thông tin" });
        }

        // 2. Chuẩn hóa Action (đề phòng client gửi 'Like', 'LIKE', 'like' lung tung)
        const normalizedAction = action.toUpperCase(); // Chuyển hết về VIEW, LIKE, BOOK

        // 3. Quy đổi điểm số
        let weight = 1.0; 
        if (normalizedAction === 'LIKE') weight = 3.0;
        if (normalizedAction === 'BOOK') weight = 5.0;

        // 4. Lưu vào DB
        await prisma.interaction.create({
            data: {
                userId: userId,
                
                // Quan trọng: Ép kiểu sang Int, vì req.body.hotelId có thể là string
                hotelId: Number(hotelId), 
                
                action: normalizedAction,
                weight: weight
            }
        });

        return res.status(200).json({ message: "Tracked success" });

    } catch (error) {
        console.error("Tracking error:", error);
        // Trả về 200 kể cả lỗi để không làm phiền trải nghiệm user phía Client
        return res.status(200).json({ message: "Error but ignored" });
    }
}