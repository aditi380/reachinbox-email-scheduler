import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
import { sendTestEmail } from "./emailService";
dotenv.config();

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is missing in .env");
}

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

type EmailJobData = {
  id: string;
  campaignId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  delaySeconds: number;
  hourlyLimit: number;
};

const emailWorker = new Worker<EmailJobData>(
  "email-queue",
  async (job: Job<EmailJobData>) => {
    const email = job.data;

    console.log("Processing email job:", {
      jobId: job.id,
      recipient: email.recipient,
      subject: email.subject,
    });

await sendTestEmail(
  email.recipient,
  email.subject,
  email.body
);

console.log(`Test email sent for ${email.recipient}`);

    return {
      success: true,
      recipient: email.recipient,
      processedAt: new Date().toISOString(),
    };
  },
  {
    connection,
    concurrency: 5,
  }
);

emailWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed.`);
});

emailWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

console.log("Email worker initialized.");

async function shutdown() {
  console.log("Shutting down email worker...");
  await emailWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);