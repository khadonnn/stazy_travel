import { Request, Response } from 'express';
import { prisma, Prisma } from '@repo/product-db'; // Giả sử db chung
// import { producer } from '../utils/kafka';

// 1. GET HOTELS (Lọc nâng cao: Giá, Search, Category, Bedroom, Sort)
export const getHotels = async (req: Request, res: Response) => {
    try {
        const {
            search,
            category,
            price_min,
            price_max,
            bedrooms,
            limit,
            page = 1,
            sort, // 'saleOff' | 'viewCount' | 'price_asc' | 'price_desc'
        } = req.query;

        // A. Xây dựng điều kiện WHERE
        const where: Prisma.HotelWhereInput = {
            // 1. Full-text search theo Title hoặc Address
            OR: search
                ? [
                      {
                          title: {
                              contains: search as string,
                              mode: 'insensitive',
                          },
                      },
                      {
                          address: {
                              contains: search as string,
                              mode: 'insensitive',
                          },
                      },
                  ]
                : undefined,

            // 2. Filter theo Category (dựa vào quan hệ bảng Category)
            categoryId: category ? Number(category) : undefined,

            // 3. Filter theo khoảng giá (Decimal)
            price: {
                gte: price_min ? Number(price_min) : undefined,
                lte: price_max ? Number(price_max) : undefined,
            },

            // 4. Filter số phòng ngủ (Logic 4+ hoặc chính xác số)
            bedrooms: bedrooms
                ? String(bedrooms) === '4+'
                    ? { gte: 4 }
                    : Number(bedrooms)
                : undefined,
        };

        // B. Xây dựng điều kiện ORDER BY
        let orderBy: Prisma.HotelOrderByWithRelationInput = {
            createdAt: 'desc',
        }; // Mặc định mới nhất

        switch (sort) {
            case 'price_asc':
                orderBy = { price: 'asc' };
                break;
            case 'price_desc':
                orderBy = { price: 'desc' };
                break;
            case 'viewCount':
                orderBy = { viewCount: 'desc' };
                break;
            case 'reviewCount':
                orderBy = { reviewCount: 'desc' };
                break;
            case 'saleOff':
                orderBy = { saleOffPercent: 'desc' };
                break; // Sort theo cột % đã thêm
        }

        // C. Thực thi Query
        const take = limit ? Number(limit) : 10;
        const skip = (Number(page) - 1) * take;

        const [hotels, total] = await Promise.all([
            prisma.hotel.findMany({
                where,
                orderBy,
                take,
                skip,
                include: {
                    category: true, // Lấy luôn tên loại hình
                    // Không cần include author ở list để nhẹ payload, trừ khi cần hiển thị avatar
                },
            }),
            prisma.hotel.count({ where }),
        ]);

        res.status(200).json({
            data: hotels,
            pagination: {
                total,
                page: Number(page),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching hotels', error });
    }
};

// 2. GET SINGLE HOTEL (Chi tiết + Author Info)
export const getHotel = async (req: Request, res: Response) => {
    const { id } = req.params;

    // Tăng view count mỗi khi get detail (Optional)
    // Có thể dùng queue/kafka để tránh write database liên tục

    const hotel = await prisma.hotel.update({
        where: { id: Number(id) },
        data: { viewCount: { increment: 1 } }, // Tự động tăng view
        include: {
            category: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                    jobName: true,
                    desc: true,
                    createdAt: true, // "Tham gia từ..."
                    // KHÔNG select password/email/phone
                },
            },
        },
    });

    if (!hotel) return res.status(404).json({ message: 'Hotel not found' });

    return res.status(200).json(hotel);
};

// 3. CREATE HOTEL (Dành cho Host)
export const createHotel = async (req: Request, res: Response) => {
    try {
        const data = req.body;

        // Xử lý logic SaleOff (chuyển "-10%..." thành số)
        let salePercent = 0;
        if (data.saleOff && typeof data.saleOff === 'string') {
            const match = data.saleOff.match(/(\d+)%/);
            if (match) salePercent = parseInt(match[1], 10);
        }

        const hotel = await prisma.hotel.create({
            data: {
                // --- NHÓM CƠ BẢN ---
                title: data.title,
                description: data.description,
                price: data.price,
                address: data.address,
                slug: data.slug, // Hoặc href nếu bạn chưa đổi
                
                // --- NHÓM ẢNH ---
                featuredImage: data.featuredImage,
                galleryImgs: data.galleryImgs,

                // --- NHÓM TIỆN ÍCH ---
                amenities: data.amenities,
                maxGuests: data.maxGuests,
                bedrooms: data.bedrooms,
                bathrooms: data.bathrooms,
                
                // --- NHÓM MAP ---
                map: data.map,

                // --- NHÓM QUAN HỆ ---
                categoryId: data.categoryId,
                authorId: data.authorId,

                // ===============================================
                // --- SỬA Ở ĐÂY: CHO PHÉP NHẬP DỮ LIỆU FAKE ---
                // ===============================================
                
                // 1. Nếu data gửi lên có thì lấy, không thì mặc định 0
                reviewCount: data.reviewCount || 0,
                viewCount: data.viewCount || 0,
                reviewStart: data.reviewStart || 0, // Lưu ý chính tả: Start hay Star?
                commentCount: data.commentCount || 0,
                
                // 2. Boolean
                like: data.like !== undefined ? data.like : false,
                isAds: data.isAds !== undefined ? data.isAds : false,

                // 3. Chuỗi SaleOff (Text hiển thị)
                // Lúc nãy mình quên dòng này nên nó bị NULL
                saleOff: data.saleOff, 
                saleOffPercent: salePercent, // Số % để tính toán
            },
        });

        res.status(201).json(hotel);

    } catch (error: any) {
        console.log("Error:", error);
        res.status(500).json({ message: 'Create failed', error: error.message });
    }
};

// 4. UPDATE HOTEL
export const updateHotel = async (req: Request, res: Response) => {
    const { id } = req.params;
    let data = req.body;

    // 🔥 Loại bỏ các field không được phép update
    const { id: _id, date: _date, ...safeData } = data; // dùng destructuring để loại bỏ

    // Nếu bạn CẦN update `date`, hãy chuẩn hóa nó → ISO
    if (data.date) {
        // Chuyển "Dec 19, 2024" → Date → ISO string
        const dateObj = new Date(data.date);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        safeData.date = dateObj.toISOString(); // hoặc dateObj.toISOString().split('T')[0] nếu chỉ cần ngày
    }

    // Tự động tính lại salePercent
    if (safeData.saleOff !== undefined) {
        let salePercent = 0;
        if (safeData.saleOff) {
            const match = safeData.saleOff.match(/(\d+)%/);
            if (match) salePercent = parseInt(match[1], 10);
        }
        safeData.saleOffPercent = salePercent;
    }

    try {
        const updatedHotel = await prisma.hotel.update({
            where: { id: Number(id) },
            data: safeData, // ✅ chỉ truyền safeData
        });

        return res.status(200).json(updatedHotel);
    } catch (error) {
        console.error('[Update Hotel Error]', error);
        return res.status(500).json({ message: 'Update failed', error: (error as Error).message });
    }
};

// 5. DELETE HOTEL
export const deleteHotel = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const deletedHotel = await prisma.hotel.delete({
            where: { id: Number(id) },
        });

        // producer.send('hotel.deleted', { value: Number(id) });
        return res.status(200).json(deletedHotel);
    } catch (error) {
        return res.status(400).json({ message: 'Cannot delete hotel' });
    }
};

// 6. GET CATEGORIES (Để frontend render Select box)
export const getCategories = async (req: Request, res: Response) => {
    const categories = await prisma.category.findMany();
    res.status(200).json(categories);
};

// 7. GET RELATED HOTELS (Dựa trên cùng category, ngoại trừ chính nó)
export const getRelatedHotels = async (req: Request, res: Response) => {
    try {
        // 1. Lấy tham số từ Request
        const currentHotelId = parseInt(req.params.id!); // ID khách sạn đang xem
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 4; // Mặc định hiện 4 cái
        const skip = (page - 1) * limit;

        if (!currentHotelId) {
            return res.status(400).json({ message: "Thiếu Hotel ID" });
        }

        // 2. Tìm khách sạn hiện tại để biết nó thuộc Category nào
        const currentHotel = await prisma.hotel.findUnique({
            where: { id: currentHotelId },
            select: { categoryId: true } // Chỉ cần lấy CategoryId
        });

        if (!currentHotel) {
            return res.status(404).json({ message: "Không tìm thấy khách sạn" });
        }

        const categoryId = currentHotel.categoryId;

        // 3. Query tìm các khách sạn liên quan
        // Điều kiện: Cùng Category VÀ ID khác ID hiện tại
        const whereCondition = {
            categoryId: categoryId,
            id: { not: currentHotelId }, // Loại trừ chính nó ($ne trong mongo)
            // isAds: false // (Tùy chọn) Nếu muốn lọc quảng cáo
        };

        // Thực hiện 2 lệnh song song: Lấy data và Đếm tổng (để phân trang)
        const [hotels, totalCount] = await Promise.all([
            prisma.hotel.findMany({
                where: whereCondition,
                take: limit,
                skip: skip,
                orderBy: {
                    viewCount: 'desc', // Ưu tiên hiện cái nào nhiều view (hoặc reviewStart)
                },
                // Chọn các trường cần thiết để hiển thị Card (không cần lấy hết description dài dòng)
                select: {
                    id: true,
                    title: true,
                    slug: true,     // Dùng slug để click
                    price: true,
                    address: true,
                    featuredImage: true,
                    reviewStart: true,
                    reviewCount: true,
                    saleOff: true,
                }
            }),
            prisma.hotel.count({ where: whereCondition }),
        ]);

        // 4. Trả về kết quả
        return res.status(200).json({
            data: hotels,
            pagination: {
                total: totalCount,
                page: page,
                totalPages: Math.ceil(totalCount / limit),
                limit: limit
            }
        });

    } catch (error: any) {
        console.log("Get related hotels error:", error);
        return res.status(500).json({ 
            message: "Lỗi server", 
            error: error.message 
        });
    }
};