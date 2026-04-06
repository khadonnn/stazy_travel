import { Request, Response } from "express";
import { prisma, Prisma } from "@repo/product-db"; // Giả sử db chung
import { producer } from "../utils/kafka";
import { StripeProductType } from "@repo/types";
import { ensureUserExists } from "../utils/ensure-user";

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
      page,
      sort,
    } = req.query;

    // --- HELPER PARSE SỐ AN TOÀN ---
    const parseNumber = (val: any) => {
      const num = Number(val);
      return !isNaN(num) ? num : undefined;
    };

    // 1. XỬ LÝ PAGINATION (FIX LỖI CRASH DO SỐ ÂM)
    // Nếu page không hợp lệ hoặc < 1, mặc định là 1
    const pageInt = Math.max(parseNumber(page) || 1, 1);
    const limitInt = parseNumber(limit) || 10;
    const skip = (pageInt - 1) * limitInt;

    // 2. XÂY DỰNG WHERE
    const where: Prisma.HotelWhereInput = {};

    if (search && typeof search === "string" && search.trim() !== "") {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    const categoryId = parseNumber(category);
    if (categoryId) where.categoryId = categoryId;

    const min = parseNumber(price_min);
    const max = parseNumber(price_max);

    // Logic lọc giá (Cần cẩn thận vì DB là Decimal, input là Number)
    if (min !== undefined || max !== undefined) {
      where.price = {};
      if (min !== undefined) where.price.gte = min;
      if (max !== undefined) where.price.lte = max;
    }

    if (bedrooms) {
      if (String(bedrooms) === "4+") {
        where.bedrooms = { gte: 4 };
      } else {
        const bedNum = parseNumber(bedrooms);
        if (bedNum) where.bedrooms = bedNum;
      }
    }

    // 3. XÂY DỰNG SORT (FIX LỖI SORT FIELD KHÔNG TỒN TẠI)
    let orderBy: Prisma.HotelOrderByWithRelationInput = { id: "desc" }; // Mặc định ID cho an toàn

    switch (sort) {
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "viewCount":
        orderBy = { viewCount: "desc" };
        break;
      case "reviewCount":
        orderBy = { reviewCount: "desc" };
        break;
      case "saleOff":
      case "saleOff_desc":
        orderBy = { saleOffPercent: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
        break; // Đảm bảo model Hotel có createdAt
    }

    console.log(`📡 [DEBUG] Fetching Hotels: Page ${pageInt}, Skip ${skip}`);

    // 4. THỰC THI QUERY
    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        orderBy,
        take: limitInt,
        skip: skip,
        include: {
          category: true,
        },
      }),
      prisma.hotel.count({ where }),
    ]);

    //  5. QUAN TRỌNG: CHUYỂN ĐỔI DECIMAL -> NUMBER
    // Đây là bước fix lỗi 500 Serialization
    const sanitizedHotels = hotels.map((hotel) => {
      return {
        ...hotel,
        price: Number(hotel.price), // Ép kiểu Decimal về Number
        // Nếu có các trường Decimal khác (như avgRating), ép kiểu tương tự
      };
    });

    // 6. TRẢ VỀ KẾT QUẢ
    res.status(200).json({
      data: sanitizedHotels, // Dùng dữ liệu đã sanitize
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        totalPages: Math.ceil(total / limitInt),
      },
    });
  } catch (error: any) {
    // Log lỗi ra terminal backend để bạn đọc được nguyên nhân gốc
    console.error("❌ BACKEND ERROR in getHotels:", error);

    res.status(500).json({
      message: "Internal Server Error",
      // Chỉ gửi chi tiết lỗi khi ở môi trường dev để bảo mật
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Something went wrong",
    });
  }
};

// 2. GET SINGLE HOTEL (Chi tiết + Author Info)
export const getHotel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Thiếu tham số ID hoặc Slug." });
    }

    // 🔍 1. Xác định kiểu tìm kiếm
    // Regex này kiểm tra: Nếu toàn bộ là số -> ID, ngược lại -> Slug
    const isNumeric = /^\d+$/.test(id);

    // 🔍 2. Tạo where clause (Prisma WhereUniqueInput)
    // Nếu là số thì ép kiểu về Number, nếu là chữ thì giữ nguyên
    const whereClause = isNumeric ? { id: Number(id) } : { slug: id };

    // ✅ 3. Gọi Prisma: Vừa tăng view, vừa lấy dữ liệu
    const hotel = await prisma.hotel.update({
      where: whereClause,
      data: {
        viewCount: { increment: 1 }, // Tăng view mỗi lần gọi API
      },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            jobName: true,
            desc: true,
            createdAt: true,
          },
        },
        // Nếu bạn có bảng Reviews hoặc Rooms thì include thêm ở đây
        // reviews: true,
      },
    });

    // 4. Trả về kết quả
    return res.status(200).json(hotel);
  } catch (error: any) {
    console.error("Get hotel error:", error);

    //  Xử lý lỗi Prisma P2025: Record to update not found
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Không tìm thấy khách sạn này." });
    }

    return res.status(500).json({
      message: "Lỗi server khi lấy thông tin khách sạn.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// 3. CREATE HOTEL (Dành cho Host)
export const createHotel = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    //  Ensure user exists before creating hotel
    if (!data.authorId) {
      return res.status(400).json({ message: "authorId is required" });
    }

    await ensureUserExists(data.authorId);

    // 1. Lấy User ID từ Token (Giả sử bạn có middleware gán user vào req)
    // const userId = req.user?.id;
    // Nếu chưa có auth thì tạm dùng data.authorId nhưng phải cẩn thận.

    // 2. Xử lý logic SaleOff
    let salePercent = 0;
    if (data.saleOff && typeof data.saleOff === "string") {
      const match = data.saleOff.match(/(\d+)%/);
      if (match) salePercent = parseInt(match[1], 10);
    }

    // 3. Tạo slug nếu chưa có (Fallback)
    // Nếu frontend không gửi slug, ta có thể dùng thư viện slugify để tạo từ title
    const finalSlug = data.slug || data.title.toLowerCase().replace(/ /g, "-");

    const hotel = await prisma.hotel.create({
      data: {
        // --- ÉP KIỂU SỐ ĐỂ TRÁNH LỖI ---
        title: data.title,
        description: data.description,
        price: Math.round(Number(data.price)),
        address: data.address,
        slug: finalSlug,

        featuredImage: data.featuredImage,
        galleryImgs: data.galleryImgs || [], // Mặc định mảng rỗng nếu null

        amenities: data.amenities || [],
        maxGuests: Number(data.maxGuests),
        bedrooms: Number(data.bedrooms),
        bathrooms: Number(data.bathrooms),

        map: data.map, // Đảm bảo map là object { lat, lng }

        categoryId: Number(data.categoryId),
        authorId: data.authorId, // Tốt nhất là dùng userId từ token

        // --- DỮ LIỆU FAKE / MẶC ĐỊNH ---
        reviewCount: Number(data.reviewCount) || 0,
        viewCount: Number(data.viewCount) || 0,

        // Check kỹ tên trường trong Prisma nhé
        reviewStar: Number(data.reviewStar) || 0,
        commentCount: Number(data.commentCount) || 0,

        like: Boolean(data.like), // Ép về boolean
        isAds: Boolean(data.isAds),

        saleOff: data.saleOff,
        saleOffPercent: salePercent,
      },
    });

    // --- KAFKA / STRIPE ---
    // Kiểm tra kỹ hotel.price là Decimal hay Int
    const stripProduce: StripeProductType = {
      id: hotel.id.toString(),
      name: hotel.title,
      // Nếu Prisma dùng Decimal, cần chuyển sang Number cẩn thận
      price:
        typeof hotel.price === "object" ? Number(hotel.price) : hotel.price,
    };

    // Check xem producer đã connect chưa để tránh crash app
    if (producer) {
      await producer.send("hotel.created", { value: stripProduce });
    }

    res.status(201).json(hotel);
  } catch (error: any) {
    console.log("Create Hotel Error:", error);

    // Xử lý lỗi trùng Slug (Mã lỗi P2002 của Prisma)
    if (error.code === "P2002" && error.meta?.target?.includes("slug")) {
      return res.status(409).json({
        message: "Tên khách sạn (Slug) đã tồn tại, vui lòng đổi tên khác.",
      });
    }

    res.status(500).json({ message: "Create failed", error: error.message });
  }
};

// 4. UPDATE HOTEL
export const updateHotel = async (req: Request, res: Response) => {
  const { id } = req.params;
  let data = req.body;

  //  Loại bỏ các field không được phép update
  const { id: _id, date: _date, ...safeData } = data; // dùng destructuring để loại bỏ

  // Nếu bạn CẦN update `date`, hãy chuẩn hóa nó → ISO
  if (data.date) {
    // Chuyển "Dec 19, 2024" → Date → ISO string
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
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
    console.error("[Update Hotel Error]", error);
    return res
      .status(500)
      .json({ message: "Update failed", error: (error as Error).message });
  }
};

// 5. DELETE HOTEL
export const deleteHotel = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deletedHotel = await prisma.hotel.delete({
      where: { id: Number(id) },
    });

    producer.send("hotel.deleted", { value: Number(id) });
    return res.status(200).json(deletedHotel);
  } catch (error) {
    return res.status(400).json({ message: "Cannot delete hotel" });
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
      select: { categoryId: true }, // Chỉ cần lấy CategoryId
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
          viewCount: "desc", // Ưu tiên hiện cái nào nhiều view (hoặc reviewStar)
        },
        // Chọn các trường cần thiết để hiển thị Card (không cần lấy hết description dài dòng)
        select: {
          id: true,
          title: true,
          slug: true, // Dùng slug để click
          price: true,
          address: true,
          featuredImage: true,
          reviewStar: true,
          reviewCount: true,
          saleOff: true,
        },
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
        limit: limit,
      },
    });
  } catch (error: any) {
    console.log("Get related hotels error:", error);
    return res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// admin
export const getHotelForAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Thiếu ID khách sạn." });
    }

    // Admin thường làm việc với ID số, nhưng nếu muốn hỗ trợ cả slug thì giữ logic check
    // Ở đây mình ưu tiên tìm theo ID để tối ưu hiệu năng
    const hotelId = Number(id);
    if (isNaN(hotelId)) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    // Chỉ dùng findUnique (nhẹ hơn update)
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        category: true,
        // Admin có thể cần xem full thông tin author, hoặc giữ nguyên như cũ
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            jobName: true,
          },
        },
      },
    });

    if (!hotel) {
      return res.status(404).json({ message: "Không tìm thấy khách sạn." });
    }

    res.status(200).json(hotel);
  } catch (error: any) {
    console.error("Get hotel admin error:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
};
interface AuthRequest extends Request {
  auth?: {
    userId: string;
    // thêm các field khác nếu cần (sessionId, orgId...)
  };
}
// 8. GET MY HOTELS (Author lấy khách sạn của mình)
export const getMyHotels = async (req: AuthRequest, res: Response) => {
  try {
    const authorId = req.auth?.userId; // Lấy từ Clerk middleware

    if (!authorId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hotels = await prisma.hotel.findMany({
      where: {
        authorId: authorId,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(hotels);
  } catch (error: any) {
    console.error("Get my hotels error:", error);
    res.status(500).json({ message: "Lỗi server." });
  }
};
