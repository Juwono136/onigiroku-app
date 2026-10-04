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
    locale,
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
      <p style="margin:0;padding:10px 12px;background:#ffffff;border-radius:10px;border:1px solid #f0e9e9;color:#6b7280;font-size:13px;">
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
    locale,
    preheader: isEn
      ? "Secure link to choose a new password"
      : "Link aman untuk membuat password baru",
    bodyHtml: `
      ${greet(input.user.name, locale)}
      <p style="margin:0;">
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
    locale,
    preheader: isEn
      ? "Your Onigiroku password was changed"
      : "Password Onigiroku Anda telah diubah",
    bodyHtml: `
      ${greet(input.user.name, locale)}
      <p style="margin:0 0 12px;">
        ${
          isEn
            ? "Your password was changed successfully from account settings. You can now sign in with your new password."
            : "Password Anda berhasil diubah dari pengaturan akun. Anda sekarang dapat masuk dengan password baru."
        }
      </p>
      <p style="margin:0;padding:10px 12px;background:#ffffff;border-radius:10px;border:1px solid #f0e9e9;color:#6b7280;font-size:13px;">
        ${
          isEn
            ? "If this wasn’t you, reset your password immediately and contact support."
            : "Jika bukan Anda yang mengubahnya, segera reset password dan hubungi dukungan."
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

/**
 * Sent when someone tries to register an email that already belongs to an account
 * (e.g. Google-first user later using the email/password form). Anti-enumeration
 * still returns a generic success to the browser; this email guides the real owner.
 */
export function buildExistingAccountSignUpEmail(input: {
  user: AuthEmailUser;
  loginUrl: string;
  forgotPasswordUrl: string;
  hasGoogle: boolean;
  hasCredential: boolean;
  locale?: AuthEmailLocale;
}): { subject: string; content: BrandedEmailContent; text: string } {
  const locale = input.locale ?? "id";
  const isEn = locale === "en";

  const subject = isEn
    ? "You already have an Onigiroku account"
    : "Anda sudah punya akun Onigiroku";

  const methods: string[] = [];
  if (input.hasGoogle) {
    methods.push(isEn ? "Continue with Google" : "Lanjut dengan Google");
  }
  if (input.hasCredential) {
    methods.push(
      isEn ? "Email and password" : "Email dan password",
    );
  }
  if (!input.hasCredential) {
    methods.push(
      isEn
        ? "Forgot password (to create a password for this account)"
        : "Lupa password (untuk membuat password pada akun ini)",
    );
  }

  const methodsHtml = methods
    .map(
      (m) =>
        `<li style="margin:0 0 6px;">${escapeHtml(m)}</li>`,
    )
    .join("");

  const content: BrandedEmailContent = {
    title: isEn ? "Account already registered" : "Akun sudah terdaftar",
    locale,
    preheader: isEn
      ? "Sign in with your existing Onigiroku account"
      : "Masuk dengan akun Onigiroku yang sudah ada",
    bodyHtml: `
      ${greet(input.user.name, locale)}
      <p style="margin:0 0 12px;">
        ${
          isEn
            ? "Someone tried to create a new Onigiroku account with this email. You already have an account — no duplicate was created."
            : "Seseorang mencoba membuat akun Onigiroku baru dengan email ini. Anda sudah punya akun — tidak ada data duplikat yang dibuat."
        }
      </p>
      <p style="margin:0 0 8px;font-weight:600;">
        ${isEn ? "How to sign in:" : "Cara masuk:"}
      </p>
      <ul style="margin:0 0 12px;padding-left:18px;color:#434040;">
        ${methodsHtml}
      </ul>
      <p style="margin:0;padding:10px 12px;background:#ffffff;border-radius:10px;border:1px solid #f0e9e9;color:#6b7280;font-size:13px;">
        ${escapeHtml(input.user.email)}
      </p>
    `,
    ctaLabel: isEn ? "Go to sign in" : "Ke halaman masuk",
    ctaUrl: input.loginUrl,
    footerNote: isEn
      ? `Need a password for a Google account? Use forgot password: ${input.forgotPasswordUrl}`
      : `Butuh password untuk akun Google? Gunakan lupa password: ${input.forgotPasswordUrl}`,
  };

  const text = isEn
    ? `You already have an Onigiroku account for ${input.user.email}. Sign in: ${input.loginUrl}. Forgot password: ${input.forgotPasswordUrl}`
    : `Anda sudah punya akun Onigiroku untuk ${input.user.email}. Masuk: ${input.loginUrl}. Lupa password: ${input.forgotPasswordUrl}`;

  return { subject, content, text };
}
