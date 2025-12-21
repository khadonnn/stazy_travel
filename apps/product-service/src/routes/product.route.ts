import { Router } from 'express';

const router: Router = Router();

router.get('/test', (req, res) => {
    res.json({ message: 'Product route is working' });
});

// --- PUBLIC ROUTES (Guest) ---
router.get('/', HotelController.getHotels); // Lọc, tìm kiếm, phân trang
router.get('/:id', HotelController.getHotel); // Xem chi tiết hotel + author info
router.get('/:id/related', HotelController.getRelatedHotels); // (Optional) Khách sạn liên quan

// --- PROTECTED ROUTES (Host/Author) ---
router.post('/', requireAuth, HotelController.createHotel);
router.put('/:id', requireAuth, requireAuthor, HotelController.updateHotel); // Chỉ tác giả mới được sửa
router.delete('/:id', requireAuth, requireAuthor, HotelController.deleteHotel);
export default router;
