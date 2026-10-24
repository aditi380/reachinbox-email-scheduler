import { sendTestEmail } from "./emailService";

async function main() {
  try {
    const result = await sendTestEmail(
      "test@example.com",
      "ReachInbox Test Email",
      "Hello! This is a test email from ReachInbox."
    );

    console.log("Email sent successfully.");

    if (result.messageId) {
      console.log("Message ID:", result.messageId);
    }

    if (result.messageId) {
      console.log("Preview URL:", (await import("nodemailer")).default.getTestMessageUrl(result));
    }
  } catch (error) {
    console.error("Email test failed:", error);
  }
}

main();