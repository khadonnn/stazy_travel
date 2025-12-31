import Fastify from 'fastify';
import { clerkClient, clerkPlugin, getAuth } from '@clerk/fastify';
import { shouldBeUser } from './middleware/authMiddleware.js';
import { connectBookingDB } from '@repo/booking-db';
import { bookingRoute } from './routes/booking.js';
import { consumer, producer } from './utils/kafka.js';
import { runKafkaSubscriptions } from './utils/subscriptions.js';
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
fastify.register(bookingRoute)


const start = async () => {
  try {
 await Promise.all([
        connectBookingDB(),
        producer.connect(),
    ]);
    await runKafkaSubscriptions();
    await fastify.listen({ port: 8001 });
    console.log("Order service is running on port 8001");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};
start();
