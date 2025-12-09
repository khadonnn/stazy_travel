import { serve } from '@hono/node-server';

import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        uptime: process.uptime(),
        timeStamp: Date.now(),
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
