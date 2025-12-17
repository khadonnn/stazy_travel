import express, { Request, Response } from 'express';
import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express';
import cors from 'cors';
import { shouldBeUser } from './middleware/authMiddleware.js';
const PORT = process.env.PORT || 8000;

const app = express();
app.use(clerkMiddleware());
app.use(express.json());

app.use(
    cors({
        origin: ['http://localhost:3002', 'http://localhost:3003'],
        credentials: true,
    }),
);

// route

app.use('/health', (req: Request, res: Response) => {
    return res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timeStamp: Date.now(),
    });
});
app.get('/test', shouldBeUser, (req, res) => {
    res.json({ message: 'Product service authenticated', userId: req.userId });
});
app.listen(PORT, () => {
    console.log(`Product service is running on port ${PORT}`);
});
