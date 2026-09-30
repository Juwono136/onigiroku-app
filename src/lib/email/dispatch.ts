import { logger } from "@/lib/logger";
import { sendBrandedEmail, type SendEmailInput } from "@/lib/email";
import type { BrandedEmailContent } from "@/lib/email/templates/layout";

type BrandedDispatch = Omit<SendEmailInput, "html"> & {
  content: BrandedEmailContent;
};

/**
 * Send branded email without blocking the HTTP response.
 * Auth endpoints feel snappy; SMTP latency is handled in the background.
 */
export function dispatchBrandedEmail(input: BrandedDispatch) {
  void sendBrandedEmail(input).catch((error) => {
    logger.error("Background branded email failed", {
      to: input.to,
      subject: input.subject,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
