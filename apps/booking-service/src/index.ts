import Fastify from 'fastify';
import { clerkClient, clerkPlugin, getAuth } from '@clerk/fastify';
const fastify = Fastify({ logger: true });
fastify.register(clerkPlugin);

fastify.get('/health', async (request, reply) => {
    return reply.status(200).send({
        status: 'ok',
        uptime: process.uptime(),
        timeStamp: Date.now(),
    });
});
fastify.get('/test', async (request, reply) => {
    const { userId } = getAuth(request);
    if (!userId) {
        return reply.status(401).send({ error: 'you are not logged in' });
    }
    console.log('userId', userId);
    return reply
        .status(200)
        .send({ message: `booking service accessed by user ${userId}` });
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
