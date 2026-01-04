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
router.get("/:id", getUserById);
router.delete("/:id", deleteUser);
router.patch("/:id", updateUser);

export default router;
