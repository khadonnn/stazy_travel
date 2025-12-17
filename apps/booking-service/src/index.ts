import Fastify from 'fastify';
import { clerkClient, clerkPlugin, getAuth } from '@clerk/fastify';
import { shouldBeUser } from './middleware/authMiddleware.js';
const fastify = Fastify({ logger: true });
fastify.register(clerkPlugin);

fastify.get('/health', async (request, reply) => {
    return reply.status(200).send({
        status: 'ok',
        uptime: process.uptime(),
        timeStamp: Date.now(),
    });
});
fastify.get('/test', { preHandler: shouldBeUser }, (request, reply) => {
    return reply.send({
        message: 'Booking service is authenticated!',
        userId: request.userId,
    });
});

const start = async () => {
    try {
        await fastify.listen({ port: 8001 });
        fastify.log.info(`Order service listening on port 8001`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
