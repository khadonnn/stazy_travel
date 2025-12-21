import { Router } from 'express';
import {
    createCategory,
    deleteCategory,
    getCategories,
    updateCategory,
} from '../controllers/category.controller';
// Giả sử đường dẫn middleware của bạn ở đây
import { shouldBeAdmin } from '../middleware/authMiddleware';

const router: Router = Router();

// --- PUBLIC ROUTES ---
// Ai cũng xem được danh sách loại phòng
router.get('/', getCategories);

// --- PROTECTED ROUTES (ADMIN ONLY) ---
// Chỉ Admin mới được tạo, sửa, xóa danh mục
router.post('/', shouldBeAdmin, createCategory);
router.put('/:id', shouldBeAdmin, updateCategory);
router.delete('/:id', shouldBeAdmin, deleteCategory);

export default router;
