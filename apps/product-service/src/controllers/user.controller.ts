import { Request, Response } from "express";
import { prisma, Prisma } from "@repo/product-db";

export const createUser = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // 1. Validate các trường bắt buộc
    if (!data.email || !data.password || !data.name) {
      return res.status(400).json({
        message: "Vui lòng nhập Email, Password và Name",
      });
    }

    // 2. Xử lý Date (dob) nếu có
    // Client gửi string "2000-01-01", cần chuyển thành Date object
    let dateOfBirth = null;
    if (data.dob) {
      dateOfBirth = new Date(data.dob);
    }

    // 3. Hash password (Khuyên dùng trong thực tế)
    // const hashedPassword = await bcrypt.hash(data.password, 10);

    // 4. Tạo User
    const newUser = await prisma.user.create({
      data: {
        // Quan trọng: Cho phép điền ID thủ công để fix lỗi Hotel
        // Nếu data.id có giá trị -> dùng nó. Nếu null/undefined -> Prisma tự uuid()
        id: data.id,

        email: data.email,
        password: data.password, // Thực tế nên lưu hashedPassword
        name: data.name,

        // Các trường tùy chọn (Optional)
        nickname: data.nickname,
        phone: data.phone,
        gender: data.gender,
        dob: dateOfBirth,
        address: data.address,
        avatar: data.avatar,
        bgImage: data.bgImage,
        jobName: data.jobName,
        desc: data.desc,

        // Role mặc định là USER, nhưng cho phép admin set role khác
        role: data.role,
      },
    });

    // 5. Trả về kết quả (nên ẩn password khi trả về)
    const { password, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "Tạo user thành công",
      data: userWithoutPassword,
    });
  } catch (error: any) {
    console.log("Create user error:", error);

    // Bắt lỗi trùng Email (Unique constraint)
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Email này đã tồn tại trong hệ thống.",
      });
    }

    res.status(500).json({
      message: "Lỗi server",
      error: error.message,
    });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    // 1. Lấy các tham số query (phân trang, tìm kiếm, lọc, sắp xếp)
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // max 100 items
    const offset = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || "";
    const role = req.query.role as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder =
      (req.query.sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc";

    // 2. Xây dựng điều kiện WHERE (nếu có tìm kiếm hoặc lọc role)
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { nickname: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    // 3. Thực hiện đếm tổng số bản ghi (cho phân trang)
    const total = await prisma.user.count({ where });

    // 4. Lấy danh sách users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        avatar: true,
        bgImage: true,
        jobName: true,
        desc: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // ⚠️ Không select `password` — đảm bảo an toàn
        // hotels: true, // bỏ nếu không cần — tránh N+1 query
        // interactions: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: offset,
      take: limit,
    });

    // 5. Trả về kết quả
    res.status(200).json({
      success: true,
      message: "Lấy danh sách người dùng thành công",
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Get users error:", error);

    // Xử lý lỗi Prisma (ví dụ: DB connection, invalid sort field)
    if (error.code === "P2010" || error.code === "P2012") {
      return res.status(400).json({
        success: false,
        message: "Tham số sắp xếp không hợp lệ. Vui lòng kiểm tra `sortBy`.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách người dùng",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ✅ Kiểm tra cơ bản: id phải là string không rỗng
    if (!id || typeof id !== "string" || id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ. Vui lòng cung cấp ID là chuỗi không rỗng.",
      });
    }

    console.log("🔍 getUserById - userId:", id);
    console.log("🔍 includeHotels query:", req.query.includeHotels);

    // 🔍 Lấy user — không cần validate định dạng UUID nữa
    const user = await prisma.user.findUnique({
      where: { id: id.trim() }, // trim() phòng trường hợp space thừa
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        avatar: true,
        bgImage: true,
        jobName: true,
        desc: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // ⚠️ Không select `password`

        // 📌 Tùy chọn: chỉ load hotels nếu query ?includeHotels=true
        hotels:
          req.query.includeHotels === "true"
            ? {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  address: true,
                  price: true,
                  featuredImage: true,
                  reviewStar: true,
                  reviewCount: true,
                  maxGuests: true,
                  bedrooms: true,
                  status: true,
                },
                // TẠM BỎ FILTER APPROVED ĐỂ TEST
                // where: {
                //   status: "APPROVED",
                // },
                orderBy: {
                  createdAt: "desc",
                },
                take: 50, // Giới hạn tối đa 50 hotels
              }
            : false,
      },
    });

    console.log("🏨 Hotels found:", user?.hotels?.length || 0);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng với ID này.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Lấy thông tin người dùng thành công",
      data: user,
    });
  } catch (error: any) {
    console.error("Get user by ID error:", error);

    if (error.code?.startsWith("P2")) {
      return res.status(500).json({
        success: false,
        message: "Lỗi cơ sở dữ liệu. Vui lòng thử lại sau.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy thông tin người dùng",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ.",
      });
    }
    const data = req.body;

    // 🔐 (Tùy chọn) Kiểm tra quyền tại middleware — ở đây chỉ validate ID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ.",
      });
    }

    // 📝 Chuẩn bị dữ liệu cập nhật
    const updateData: any = {};

    // --- Các trường được phép cập nhật ---
    if (data.name !== undefined) updateData.name = data.name;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.bgImage !== undefined) updateData.bgImage = data.bgImage;
    if (data.jobName !== undefined) updateData.jobName = data.jobName;
    if (data.desc !== undefined) updateData.desc = data.desc;

    // 🗓 Xử lý dob (string → Date)
    if (data.dob !== undefined) {
      updateData.dob = data.dob ? new Date(data.dob) : null;
    }

    // 👤 Cập nhật role — chỉ admin được phép (kiểm tra ở middleware, hoặc thêm logic ở đây)
    if (data.role !== undefined) {
      // ⚠️ Cảnh báo: nếu không có middleware, nên kiểm tra req.user.role ở đây
      // Ví dụ: if (req.user?.role !== 'ADMIN') return res.status(403)...
      updateData.role = data.role;
    }

    // 🔒 Cập nhật password — cần hash (ở đây chỉ demo, KHÔNG lưu plain text!)
    if (data.password !== undefined) {
      if (!data.currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp mật khẩu hiện tại để đổi mật khẩu mới.",
        });
      }
      // → Thực tế: so sánh `currentPassword` với hash trong DB (dùng bcrypt.compare)
      // → Sau đó: hash `data.password` mới → lưu vào DB
      // Vì đây là prototype, ta tạm skip hash — NHƯNG KHÔNG NÊN LÀM VẬY TRONG PROD
      updateData.password = data.password; // ⚠️ Chỉ dùng cho dev/mock
    }

    // 🚫 Không cho phép đổi email qua API này (tránh xung đột unique)
    // → Nếu cần, tách thành endpoint `/change-email` riêng với xác minh OTP

    // ✅ Cập nhật
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        nickname: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        avatar: true,
        bgImage: true,
        jobName: true,
        desc: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // ❌ Không trả password
      },
    });

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin người dùng thành công",
      updatedUser,
    });
  } catch (error: any) {
    console.error("Update user error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng để cập nhật.",
      });
    }

    if (error.code === "P2002" && error.meta?.target?.includes("email")) {
      return res.status(409).json({
        success: false,
        message: "Email này đã được sử dụng bởi người dùng khác.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật người dùng",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string" || id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ.",
      });
    }
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: "ID không hợp lệ.",
      });
    }

    // 🔍 Kiểm tra user tồn tại trước khi xóa (để trả 404 nếu không có)
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng để xóa.",
      });
    }

    // 🗑 Xóa user (và các bản ghi liên quan — Prisma tự động cascade nếu có `onDelete: Cascade`)
    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Xóa người dùng thành công",
      data: { id },
    });
  } catch (error: any) {
    console.error("Delete user error:", error);

    // Lỗi: user có dữ liệu liên quan (và không có cascade)
    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message:
          "Không thể xóa người dùng vì có dữ liệu liên quan (hotel, interaction, ...).",
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa người dùng",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
