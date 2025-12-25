import { Router } from 'express';
import { createUser } from '../controllers/user.controller';

const router: Router = Router();

router.get('/test', (req, res) => {
    res.json({ message: 'Product route is working' });
});


// // --- PROTECTED ROUTES (Host/Author) ---
router.post('/', createUser);

export default router;
