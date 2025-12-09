import express, { Request, Response } from 'express';
import cors from 'cors';
const PORT = process.env.PORT || 8000;

const app = express();

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

app.listen(PORT, () => {
    console.log(`Product service is running on port ${PORT}`);
});
