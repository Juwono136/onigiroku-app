import nodemailer from "nodemailer";

import { logger } from "@/lib/logger";
import {
  renderBrandedEmail,
  type BrandedEmailContent,
} from "@/lib/email/templates/layout";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP is not fully configured");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 20_000,
  });
}

let sharedTransport: ReturnType<typeof createTransport> | null = null;

function getTransport() {
  if (!sharedTransport) {
    sharedTransport = createTransport();
  }
  return sharedTransport;
}

export async function sendEmail(input: SendEmailInput) {
  try {
    const transport = getTransport();
    const fromName = process.env.SMTP_FROM_NAME ?? "Onigiroku";
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

    const info = await transport.sendMail({
      from: `"${fromName}" <${from}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? process.env.SMTP_REPLY_TO,
    });

    logger.info("Email sent", {
      messageId: info.messageId,
      to: input.to,
      subject: input.subject,
    });

    return { success: true as const, messageId: info.messageId };
  } catch (error) {
    logger.error("Failed to send email", {
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Send a branded HTML email using the shared layout. */
export async function sendBrandedEmail(
  input: Omit<SendEmailInput, "html"> & {
    content: BrandedEmailContent;
  },
) {
  const html = renderBrandedEmail(input.content);
  const text =
    input.text ??
    [
      input.content.title,
      input.content.ctaUrl ? `Link: ${input.content.ctaUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

  return sendEmail({
    to: input.to,
    subject: input.subject,
    html,
    text,
    replyTo: input.replyTo,
  });
}
