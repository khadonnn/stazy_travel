import { Request, Response } from 'express';
import { prisma, Prisma } from '@repo/product-db';

export const createUser = async (req: Request, res: Response) => {
    try {
        const data = req.body;

        // 1. Validate các trường bắt buộc
        if (!data.email || !data.password || !data.name) {
            return res.status(400).json({ 
                message: 'Vui lòng nhập Email, Password và Name' 
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
            data: userWithoutPassword
        });

    } catch (error: any) {
        console.log("Create user error:", error);

        // Bắt lỗi trùng Email (Unique constraint)
        if (error.code === 'P2002') {
            return res.status(409).json({ 
                message: 'Email này đã tồn tại trong hệ thống.' 
            });
        }

        res.status(500).json({ 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};