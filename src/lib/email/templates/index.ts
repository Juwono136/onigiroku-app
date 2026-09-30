export {
  escapeHtml,
  getEmailBrandName,
  getEmailLogoUrl,
  getEmailSupportUrl,
  renderBrandedEmail,
  type BrandedEmailContent,
} from "@/lib/email/templates/layout";

export {
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
  type AuthEmailLocale,
} from "@/lib/email/templates/auth";
