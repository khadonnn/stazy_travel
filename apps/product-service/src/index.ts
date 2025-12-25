import express, { NextFunction, Request, Response } from 'express';
import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express';
import cors from 'cors';
import { shouldBeUser } from './middleware/authMiddleware.js';
const PORT = process.env.PORT || 8000;
import productRouter from './routes/product.route.js';
import categoryRouter from './routes/category.route.js';
import userRouter from './routes/user.route.js';
const app = express();
app.use(clerkMiddleware());
app.use(express.json());
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.log('Error handler called:', err);
    return res
        .status(500)
        .json({ message: err.message || 'Internal Server Error' });
});

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

app.use('/hotels', productRouter);
app.use('/categories', categoryRouter);
app.use("/users", userRouter);

app.listen(PORT, () => {
    console.log(`Product service is running on port ${PORT}`);
});
