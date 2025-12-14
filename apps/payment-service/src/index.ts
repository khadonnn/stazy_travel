import { serve } from '@hono/node-server';

import { Hono } from 'hono';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { shouldBeUser } from './middleware/authMiddleware.js';
const app = new Hono();
app.use('*', clerkMiddleware());
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
