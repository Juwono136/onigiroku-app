/**
 * Shared transactional email layout helpers.
 * Used by auth and future non-auth notifications (billing, CMS, etc.).
 */

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

export function getEmailSupportUrl() {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return `${site.replace(/\/$/, "")}/#faq`;
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
};

/**
 * Professional, email-client-safe HTML shell (table layout, inline CSS).
 * Responsive via fluid max-width + viewport meta.
 */
export function renderBrandedEmail(content: BrandedEmailContent) {
  const brand = getEmailBrandName();
  const logoUrl = getEmailLogoUrl();
  const year = new Date().getFullYear();
  const supportUrl = getEmailSupportUrl();
  const preheader = content.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        ${escapeHtml(content.preheader)}
      </div>`
    : "";

  const cta =
    content.ctaLabel && content.ctaUrl
      ? `
        <tr>
          <td align="center" style="padding: 4px 28px 28px;">
            <a href="${escapeHtml(content.ctaUrl)}"
               style="display:inline-block;background:#E60012;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1.2;padding:14px 28px;border-radius:12px;mso-padding-alt:0;">
              <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%;mso-text-raise:21pt">&nbsp;</i><![endif]-->
              <span style="mso-text-raise:10pt;">${escapeHtml(content.ctaLabel)}</span>
              <!--[if mso]><i style="letter-spacing:28px;mso-font-width:-100%">&nbsp;</i><![endif]-->
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 20px;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;word-break:break-all;">
              ${escapeHtml(content.ctaUrl)}
            </p>
          </td>
        </tr>`
      : "";

  const footerNote = content.footerNote
    ? `<p style="margin:0 0 12px;color:#6b7280;font-size:13px;line-height:1.55;">${content.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F3F4F6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E8E6E3;box-shadow:0 8px 24px rgba(24,24,27,0.06);">
          <tr>
            <td align="center" style="padding:28px 24px 16px;background:linear-gradient(180deg,#FAF8F6 0%,#ffffff 100%);">
              <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brand)}" width="56" height="56" style="display:block;border:0;outline:none;width:56px;height:56px;object-fit:contain;" />
              <p style="margin:12px 0 0;font-size:18px;font-weight:700;color:#18181B;letter-spacing:-0.02em;">${escapeHtml(brand)}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Japanese learning, measured</p>
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:#E60012;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#18181B;font-weight:700;">${escapeHtml(content.title)}</h1>
              <div style="color:#434040;font-size:15px;line-height:1.65;">
                ${content.bodyHtml}
              </div>
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:8px 28px 28px;border-top:1px solid #F3F4F6;">
              ${footerNote}
              <p style="margin:0 0 8px;color:#9ca3af;font-size:12px;line-height:1.5;">
                Butuh bantuan? <a href="${escapeHtml(supportUrl)}" style="color:#E60012;text-decoration:none;">Kunjungi pusat bantuan</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">© ${year} ${escapeHtml(brand)}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
