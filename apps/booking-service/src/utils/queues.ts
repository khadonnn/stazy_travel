/**
 * Global queue instances
 *
 * This module initializes all BullMQ queues used across the booking service.
 * Import from this file to get access to queues.
 */

import type { Queue } from "@repo/bullmq";
import { createSagaTimeoutQueue } from "../queues/saga-timeout.queue.js";
import type { SagaTimeoutJobData } from "../queues/saga-timeout.queue.js";
import { createBookingEventsQueue } from "../queues/booking-events.queue.js";
import type { BookingEventJobData } from "../queues/booking-events.queue.js";

let sagaTimeoutQueueInstance: Queue<SagaTimeoutJobData> | null = null;
let bookingEventsQueueInstance: Queue<BookingEventJobData> | null = null;

export const initializeQueues = async (): Promise<{
  sagaTimeout: Queue<SagaTimeoutJobData>;
  bookingEvents: Queue<BookingEventJobData>;
}> => {
  sagaTimeoutQueueInstance = createSagaTimeoutQueue();
  bookingEventsQueueInstance = createBookingEventsQueue();
  return {
    sagaTimeout: sagaTimeoutQueueInstance,
    bookingEvents: bookingEventsQueueInstance,
  };
};

export const getSagaTimeoutQueue = (): Queue<SagaTimeoutJobData> | null => {
  return sagaTimeoutQueueInstance;
};

export const setSagaTimeoutQueue = (queue: Queue<SagaTimeoutJobData>) => {
  sagaTimeoutQueueInstance = queue;
};

export const getBookingEventsQueue = (): Queue<BookingEventJobData> | null => {
  return bookingEventsQueueInstance;
};

export const setBookingEventsQueue = (queue: Queue<BookingEventJobData>) => {
  bookingEventsQueueInstance = queue;
};
