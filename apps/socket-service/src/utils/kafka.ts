import { createConsumer, createKafkaClient, createProducer } from "@repo/kafka";

const kafkaClient = createKafkaClient("socket-service");

export const producer = createProducer(kafkaClient);
export const consumer = createConsumer(kafkaClient, "socket-group");
