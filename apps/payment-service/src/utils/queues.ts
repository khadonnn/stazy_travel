/**
 * Global queue instances for payment service
 */

import type { Queue } from "@repo/bullmq";
import { createPaymentQueue } from "../queues/payment.queue.js";
import type { PaymentJobData } from "../queues/payment.queue.js";
import { createStripeProductQueue } from "../queues/stripe-product.queue.js";
import type { StripeProductJobData } from "../queues/stripe-product.queue.js";

let paymentQueueInstance: Queue<PaymentJobData> | null = null;
let stripeProductQueueInstance: Queue<StripeProductJobData> | null = null;

export const initializeQueues = async (): Promise<{
  payment: Queue<PaymentJobData>;
  stripeProduct: Queue<StripeProductJobData>;
}> => {
  paymentQueueInstance = createPaymentQueue();
  stripeProductQueueInstance = createStripeProductQueue();
  return {
    payment: paymentQueueInstance,
    stripeProduct: stripeProductQueueInstance,
  };
};

export const getPaymentQueue = (): Queue<PaymentJobData> | null => {
  return paymentQueueInstance;
};

export const setPaymentQueue = (queue: Queue<PaymentJobData>) => {
  paymentQueueInstance = queue;
};

export const getStripeProductQueue = (): Queue<StripeProductJobData> | null => {
  return stripeProductQueueInstance;
};

export const setStripeProductQueue = (queue: Queue<StripeProductJobData>) => {
  stripeProductQueueInstance = queue;
};
