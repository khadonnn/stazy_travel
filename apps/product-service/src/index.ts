import express, { Request, Response } from 'express';
import { clerkClient, clerkMiddleware, getAuth } from '@clerk/express';
import cors from 'cors';
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

app.get('/test', (req: Request, res: Response) => {
    const auth = getAuth(req);
    const userId = auth.userId;
    if (!userId) {
        return res.status(401).send({ message: 'You are not logged in' });
    }
    console.log(auth);
    res.send({ message: 'Product service is working!' });
});
app.listen(PORT, () => {
    console.log(`Product service is running on port ${PORT}`);
});
