import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  updateUser,
} from "../controllers/user.controller";

const router: Router = Router();

router.get("/test", (req, res) => {
  res.json({ message: "Product route is working" });
});

// // --- PROTECTED ROUTES (Host/Author) ---
router.post("/", createUser);
router.get("/", getUsers);

// --- ADMIN ONLY: Update user role (MUST be before /:id) ---
router.patch("/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ["USER", "AUTHOR", "ADMIN"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role không hợp lệ. Chỉ chấp nhận: ${validRoles.join(", ")}`,
      });
    }

    // Update role in PostgreSQL
    const { prisma } = await import("@repo/product-db");
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // TODO: Sync role to Clerk if needed
    // const clerkClient = await import("@clerk/clerk-sdk-node");
    // await clerkClient.users.updateUserMetadata(id, {
    //   publicMetadata: { role }
    // });

    res.status(200).json({
      success: true,
      message: `Đã cập nhật role thành ${role}`,
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Update role error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật role",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Other routes (/:id MUST be after /:id/role)
router.get("/:id", getUserById);
router.delete("/:id", deleteUser);
router.patch("/:id", updateUser);

export default router;
