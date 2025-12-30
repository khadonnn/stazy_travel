import { serve } from '@hono/node-server';

import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { shouldBeUser } from './middleware/authMiddleware.js';
import { ProductCode, VNPay, VnpLocale, ignoreLogger, dateFormat } from 'vnpay';


import { cors } from "hono/cors";
import paymentRoute from './routes/payment.js';

const app = new Hono();
app.use('*', clerkMiddleware());
app.use("*", cors({ origin: ["http://localhost:3002"] }));
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        uptime: process.uptime(),
        timeStamp: Date.now(),
    });
});
app.get('/test', shouldBeUser, (c) => {
    return c.json({
        message: `payment service is authenticated}`,
        userId: c.get('userId'),
    });
});
app.route("/api", paymentRoute);
const start = async () => {
    try {
        serve({
            fetch: app.fetch,
            port: 8002,
        });
        console.log('Server is running on http://localhost:8002');
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
