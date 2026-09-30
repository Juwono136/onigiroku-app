/**
 * Shared transactional email layout helpers.
 * Used by auth and future non-auth notifications (billing, CMS, etc.).
 */

export type EmailLocale = "id" | "en";

export function getEmailLogoUrl() {
  const url = process.env.EMAIL_LOGO_URL?.trim();
  if (url && /^https?:\/\//i.test(url)) {
    return url;
  }
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return `${site.replace(/\/$/, "")}/images/onigiroku-logo.png`;
}

export function getEmailBrandName() {
  return process.env.SMTP_FROM_NAME?.trim() || "Onigiroku";
}

export function getEmailSupportUrl(locale: EmailLocale = "id") {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  const base = site.replace(/\/$/, "");
  return locale === "en" ? `${base}/en#faq` : `${base}/#faq`;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type BrandedEmailContent = {
  title: string;
  /** Pre-sanitized or trusted HTML fragments (escape user input before inject). */
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  /** Optional preheader shown in inbox preview */
  preheader?: string;
  /** Drives layout chrome language (tagline, help footer, html lang). */
  locale?: EmailLocale;
};

const COPY = {
  id: {
    tagline: "Belajar Jepang yang terukur",
    helpPrefix: "Butuh bantuan?",
    helpLink: "Kunjungi pusat bantuan",
    rights: "Hak cipta dilindungi.",
    linkFallback: "Atau salin tautan ini ke browser Anda:",
  },
  en: {
    tagline: "Japanese learning, measured",
    helpPrefix: "Need help?",
    helpLink: "Visit the help center",
    rights: "All rights reserved.",
    linkFallback: "Or copy this link into your browser:",
  },
} as const;

/**
 * Professional, email-client-safe HTML shell (table layout, inline CSS).
 * Responsive via fluid max-width + viewport meta. Fully locale-aware chrome.
 */
export function renderBrandedEmail(content: BrandedEmailContent) {
  const locale: EmailLocale = content.locale === "en" ? "en" : "id";
  const copy = COPY[locale];
  const brand = getEmailBrandName();
  const logoUrl = getEmailLogoUrl();
  const year = new Date().getFullYear();
  const supportUrl = getEmailSupportUrl(locale);
  const preheader = content.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${escapeHtml(content.preheader)}
      </div>`
    : "";

  const cta =
    content.ctaLabel && content.ctaUrl
      ? `
        <tr>
          <td align="center" style="padding: 8px 28px 12px;">
            <a href="${escapeHtml(content.ctaUrl)}"
               style="display:inline-block;background:#E60012;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:1.2;padding:14px 32px;border-radius:12px;box-shadow:0 8px 20px rgba(230,0,18,0.28);">
              ${escapeHtml(content.ctaLabel)}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px;">
            <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;line-height:1.4;">
              ${escapeHtml(copy.linkFallback)}
            </p>
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;word-break:break-all;">
              <a href="${escapeHtml(content.ctaUrl)}" style="color:#9ca3af;text-decoration:underline;">${escapeHtml(content.ctaUrl)}</a>
            </p>
          </td>
        </tr>`
      : "";

  const footerNote = content.footerNote
    ? `<p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.55;">${content.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F4F6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E8E6E3;box-shadow:0 12px 32px rgba(24,24,27,0.08);">
          <tr>
            <td style="height:4px;background:#E60012;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 24px 18px;background:#FAF8F6;">
              <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brand)}" width="56" height="56" style="display:block;border:0;outline:none;width:56px;height:56px;object-fit:contain;" />
              <p style="margin:12px 0 0;font-size:20px;font-weight:700;color:#18181B;letter-spacing:-0.02em;">${escapeHtml(brand)}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;letter-spacing:0.04em;">${escapeHtml(copy.tagline)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 4px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7f7;border:1px solid #f3d4d7;border-radius:14px;">
                <tr>
                  <td style="padding:22px 22px 8px;">
                    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#18181B;font-weight:700;">${escapeHtml(content.title)}</h1>
                    <div style="color:#434040;font-size:15px;line-height:1.7;">
                      ${content.bodyHtml}
                    </div>
                  </td>
                </tr>
                ${cta}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;">
              ${footerNote}
              <p style="margin:0 0 10px;color:#9ca3af;font-size:12px;line-height:1.5;">
                ${escapeHtml(copy.helpPrefix)}
                <a href="${escapeHtml(supportUrl)}" style="color:#E60012;text-decoration:none;font-weight:600;">${escapeHtml(copy.helpLink)}</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">© ${year} ${escapeHtml(brand)}. ${escapeHtml(copy.rights)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
