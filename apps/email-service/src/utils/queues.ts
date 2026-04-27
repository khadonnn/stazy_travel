/**
 * Global queue instances for email service
 */

import type { Queue } from "@repo/bullmq";
import { createEmailQueue } from "../queues/email.queue.js";
import type { EmailJobData } from "../queues/email.queue.js";
import { createEmailEventsQueue } from "../queues/email-events.queue.js";
import type { EmailEventJobData } from "../queues/email-events.queue.js";

let emailQueueInstance: Queue<EmailJobData> | null = null;
let emailEventsQueueInstance: Queue<EmailEventJobData> | null = null;

export const initializeQueues = async (): Promise<{
  email: Queue<EmailJobData>;
  emailEvents: Queue<EmailEventJobData>;
}> => {
  emailQueueInstance = createEmailQueue();
  emailEventsQueueInstance = createEmailEventsQueue();
  return {
    email: emailQueueInstance,
    emailEvents: emailEventsQueueInstance,
  };
};

export const getEmailQueue = (): Queue<EmailJobData> | null => {
  return emailQueueInstance;
};

export const setEmailQueue = (queue: Queue<EmailJobData>) => {
  emailQueueInstance = queue;
};

export const getEmailEventsQueue = (): Queue<EmailEventJobData> | null => {
  return emailEventsQueueInstance;
};

export const setEmailEventsQueue = (queue: Queue<EmailEventJobData>) => {
  emailEventsQueueInstance = queue;
};
