import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { emailQueue } from "./emailQueue";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:3003",
    ],
    credentials: true,
  })
);

app.use(express.json());

type EmailRecord = {
  id: string;
  campaignId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  delaySeconds: number;
  hourlyLimit: number;
  status: "SCHEDULED" | "RATE_LIMITED" | "SENT" | "FAILED";
  errorMessage?: string;
  createdAt: string;
};

const emails: EmailRecord[] = [];

app.get("/", (_req, res) => {
  res.json({ message: "ReachInbox backend is running!" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/auth/me", (_req, res) => {
  res.json({
    authenticated: true,
    user: {
      email: "test@reachinbox.local",
      name: "ReachInbox User",
    },
  });
});

app.get("/api/emails/scheduled", (_req, res) => {
  res.json(emails.filter((email) => email.status === "SCHEDULED"));
});

app.get("/api/emails/sent", (_req, res) => {
  res.json(
    emails.filter(
      (email) => email.status === "SENT" || email.status === "FAILED"
    )
  );
});

app.post("/api/emails/schedule", async (req, res) => {
  try {
    const {
      recipients,
      subject,
      body,
      startTime,
      delaySeconds,
      hourlyLimit,
    } = req.body;

    if (
      !Array.isArray(recipients) ||
      recipients.length === 0 ||
      !recipients.every(
        (r: unknown) =>
          typeof r === "string" &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r)
      ) ||
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof body !== "string" ||
      !body.trim() ||
      !startTime ||
      Number.isNaN(Date.parse(startTime)) ||
      !Number.isFinite(delaySeconds) ||
      delaySeconds < 0 ||
      !Number.isInteger(hourlyLimit) ||
      hourlyLimit < 1
    ) {
      return res.status(400).json({
        message:
          "Valid recipients, subject, body, startTime, delaySeconds and hourlyLimit are required.",
      });
    }

    const campaignId = `campaign-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const created: EmailRecord[] = recipients.map(
      (recipient: string, index: number) => {
        const scheduledAt = new Date(
          Date.parse(startTime) + index * delaySeconds * 1000
        ).toISOString();

        return {
          id: `${Date.now()}-${index}`,
          campaignId,
          senderEmail: "test@reachinbox.local",
          recipient,
          subject: subject.trim(),
          body,
          scheduledAt,
          delaySeconds,
          hourlyLimit,
          status: "SCHEDULED",
          createdAt,
        };
      }
    );

    // Add emails to BullMQ with their scheduled delays.
    await Promise.all(
      created.map((email) =>
        emailQueue.add("send-email", email, {
          jobId: email.id,
          delay: Math.max(0, Date.parse(email.scheduledAt) - Date.now()),
          removeOnComplete: false,
          removeOnFail: false,
        })
      )
    );

    // Keep records in memory for the current API.
    emails.push(...created);

    return res.status(201).json({
      campaignId,
      scheduledCount: created.length,
      emails: created,
    });
  } catch (error) {
    console.error("Failed to schedule emails:", error);

    return res.status(500).json({
      message: "Failed to add emails to the scheduling queue.",
    });
  }
});

app.delete("/api/emails/scheduled/:id", async (req, res) => {
  try {
    const index = emails.findIndex(
      (email) =>
        email.id === req.params.id && email.status === "SCHEDULED"
    );

    if (index === -1) {
      return res.status(404).json({
        message: "Scheduled email not found.",
      });
    }

    await emailQueue.remove(emails[index].id);
    emails.splice(index, 1);

    return res.status(204).send();
  } catch (error) {
    console.error("Failed to delete scheduled email:", error);

    return res.status(500).json({
      message: "Failed to delete scheduled email.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});