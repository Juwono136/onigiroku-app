import {
  escapeHtml,
  type BrandedEmailContent,
} from "@/lib/email/templates/layout";

export type AuthEmailLocale = "id" | "en";

type AuthEmailUser = {
  name: string;
  email: string;
};

function greet(name: string, locale: AuthEmailLocale) {
  const safe = escapeHtml(name.trim() || (locale === "en" ? "there" : "Sobat"));
  return locale === "en"
    ? `<p style="margin:0 0 12px;">Hi <strong>${safe}</strong>,</p>`
    : `<p style="margin:0 0 12px;">Halo <strong>${safe}</strong>,</p>`;
}

/** Email verification after sign-up. */
export function buildVerificationEmail(input: {
  user: AuthEmailUser;
  url: string;
  locale?: AuthEmailLocale;
}): { subject: string; content: BrandedEmailContent; text: string } {
  const locale = input.locale ?? "id";
  const isEn = locale === "en";

  const subject = isEn
    ? "Verify your email — Onigiroku"
    : "Verifikasi email — Onigiroku";

  const content: BrandedEmailContent = {
    title: isEn ? "Confirm your account" : "Konfirmasi akun Anda",
    preheader: isEn
      ? "One click to activate your Onigiroku account"
      : "Satu klik untuk mengaktifkan akun Onigiroku Anda",
    bodyHtml: `
      ${greet(input.user.name, locale)}
      <p style="margin:0 0 12px;">
        ${
          isEn
            ? "Welcome to Onigiroku. Please verify your email to activate your account and unlock your 1-day trial."
            : "Selamat datang di Onigiroku. Verifikasi email Anda untuk mengaktifkan akun dan membuka trial 1 hari."
        }
      </p>
      <p style="margin:0 0 12px;color:#6b7280;font-size:14px;">
        ${escapeHtml(input.user.email)}
      </p>
    `,
    ctaLabel: isEn ? "Verify email" : "Verifikasi email",
    ctaUrl: input.url,
    footerNote: isEn
      ? "If you did not create an Onigiroku account, you can safely ignore this email. This link expires for your security."
      : "Jika Anda tidak mendaftar di Onigiroku, abaikan email ini. Link akan kedaluwarsa demi keamanan.",
  };

  const text = isEn
    ? `Verify your Onigiroku email: ${input.url}`
    : `Verifikasi email Onigiroku: ${input.url}`;

  return { subject, content, text };
}

/** Password reset request. */
export function buildPasswordResetEmail(input: {
  user: AuthEmailUser;
  url: string;
  locale?: AuthEmailLocale;
}): { subject: string; content: BrandedEmailContent; text: string } {
  const locale = input.locale ?? "id";
  const isEn = locale === "en";

  const subject = isEn
    ? "Reset your password — Onigiroku"
    : "Reset password — Onigiroku";

  const content: BrandedEmailContent = {
    title: isEn ? "Reset your password" : "Atur ulang password",
    preheader: isEn
      ? "Secure link to choose a new password"
      : "Link aman untuk membuat password baru",
    bodyHtml: `
      ${greet(input.user.name, locale)}
      <p style="margin:0 0 12px;">
        ${
          isEn
            ? "We received a request to reset the password for your Onigiroku account. Click the button below to continue."
            : "Kami menerima permintaan reset password untuk akun Onigiroku Anda. Klik tombol di bawah untuk melanjutkan."
        }
      </p>
    `,
    ctaLabel: isEn ? "Reset password" : "Reset password",
    ctaUrl: input.url,
    footerNote: isEn
      ? "If you did not request a password reset, ignore this email. Your current password stays unchanged."
      : "Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tetap tidak berubah.",
  };

  const text = isEn
    ? `Reset your Onigiroku password: ${input.url}`
    : `Reset password Onigiroku: ${input.url}`;

  return { subject, content, text };
}

/** Optional confirmation after password successfully changed. */
export function buildPasswordChangedEmail(input: {
  user: AuthEmailUser;
  loginUrl: string;
  locale?: AuthEmailLocale;
}): { subject: string; content: BrandedEmailContent; text: string } {
  const locale = input.locale ?? "id";
  const isEn = locale === "en";

  const subject = isEn
    ? "Password updated — Onigiroku"
    : "Password diperbarui — Onigiroku";

  const content: BrandedEmailContent = {
    title: isEn ? "Password updated" : "Password berhasil diperbarui",
    preheader: isEn
      ? "Your Onigiroku password was changed"
      : "Password Onigiroku Anda telah diubah",
    bodyHtml: `
      ${greet(input.user.name, locale)}
      <p style="margin:0 0 12px;">
        ${
          isEn
            ? "Your password was changed successfully. You can now sign in with your new password."
            : "Password Anda berhasil diubah. Anda sekarang dapat masuk dengan password baru."
        }
      </p>
    `,
    ctaLabel: isEn ? "Sign in" : "Masuk",
    ctaUrl: input.loginUrl,
    footerNote: isEn
      ? "If you did not make this change, reset your password immediately and contact support."
      : "Jika Anda tidak melakukan perubahan ini, segera reset password dan hubungi dukungan.",
  };

  const text = isEn
    ? `Your Onigiroku password was updated. Sign in: ${input.loginUrl}`
    : `Password Onigiroku Anda diperbarui. Masuk: ${input.loginUrl}`;

  return { subject, content, text };
}
