import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendTestEmail(
  recipient: string,
  subject: string,
  body: string
) {
  const result = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: recipient,
    subject,
    text: body,
  });

  console.log("Test email sent:", result.messageId);
  
  console.log(
  "Preview URL:",
  (await import("nodemailer")).default.getTestMessageUrl(result)
);

  return result;
}