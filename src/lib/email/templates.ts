/**
 * Backward-compatible entry for email templates.
 * Prefer importing from `@/lib/email/templates` going forward.
 */
export {
  escapeHtml,
  getEmailBrandName,
  getEmailLogoUrl,
  getEmailSupportUrl,
  renderBrandedEmail,
  type BrandedEmailContent,
  type AuthEmailLocale,
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
} from "@/lib/email/templates/index";
