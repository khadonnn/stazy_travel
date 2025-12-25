import { prisma, Prisma } from '@repo/product-db'; // Đảm bảo đường dẫn đúng
import { Request, Response } from 'express';

// 1. LẤY DANH SÁCH CATEGORY (Public)
export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                id: 'asc', // Sắp xếp theo ID tăng dần
            },
            include: {
                _count: {
                    select: { hotels: true }, // Đếm số lượng hotel trong mỗi category
                },
            },
        });

        // Map lại dữ liệu nếu cần để khớp hoàn toàn với Frontend
        // Frontend cần: { id, name, href, color, icon, count }
        const formattedCategories = categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            color: cat.color,
            icon: cat.icon,
            count: cat._count.hotels, // Trả về số lượng bài viết để hiển thị (ví dụ: Hotel (12))
        }));

        return res.status(200).json(formattedCategories);
    } catch (error) {
        return res
            .status(500)
            .json({ message: 'Error fetching categories', error });
    }
};

// 2. TẠO CATEGORY MỚI (Admin)
export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, slug, color, icon } = req.body;

        // Validation cơ bản
        if (!name || !slug) {
            return res
                .status(400)
                .json({ message: 'Name and Slug are required!' });
        }

        const category = await prisma.category.create({
            data: {
                name,
                slug, // Ví dụ: "/archive-stay/hotel"
                color, // Ví dụ: "blue"
                icon, // Ví dụ: "🏨"
            },
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Could not create category', error });
    }
};

// 3. CẬP NHẬT CATEGORY (Admin)
export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, slug, color, icon } = req.body;

    try {
        const category = await prisma.category.update({
            where: { id: Number(id) },
            data: {
                name,
                slug,
                color,
                icon,
            },
        });

        return res.status(200).json(category);
    } catch (error) {
        return res
            .status(404)
            .json({ message: 'Category not found or update failed' });
    }
};

// 4. XÓA CATEGORY (Admin)
export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Kiểm tra xem có Hotel nào đang dùng category này không?
        const countHotels = await prisma.hotel.count({
            where: { categoryId: Number(id) },
        });

        if (countHotels > 0) {
            return res.status(400).json({
                message: `Cannot delete. There are ${countHotels} hotels in this category.`,
            });
        }

        const category = await prisma.category.delete({
            where: { id: Number(id) },
        });

        return res
            .status(200)
            .json({ message: 'Deleted successfully', category });
    } catch (error) {
        return res.status(500).json({ message: 'Delete failed', error });
    }
};
