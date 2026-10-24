import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is missing in .env");
}

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue("email-queue", {
  connection,
});

console.log("Email queue initialized");