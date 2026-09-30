import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import {
  assertNotLockedOut,
  clearLockout,
  recordFailedLogin,
} from "@/lib/auth/lockout";
import { getDb } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { sendBrandedEmail } from "@/lib/email";
import {
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
  type AuthEmailLocale,
} from "@/lib/email/templates/index";
import { logger } from "@/lib/logger";

function buildSocialProviders() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return undefined;
  }

  return {
    google: {
      clientId,
      clientSecret,
      prompt: "select_account" as const,
    },
  };
}

function resolveTrustedOrigins() {
  const defaults = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.APP_URL,
  ].filter(Boolean) as string[];

  const extra = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...extra]));
}

function resolveAppOrigin() {
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function localeFromUser(user: { locale?: string | null }): AuthEmailLocale {
  return user.locale === "en" ? "en" : "id";
}

function isSelfRegistrationEnabled() {
  return (
    (process.env.SELF_REGISTRATION_ENABLED ?? "true").toLowerCase() !== "false"
  );
}

export const auth = betterAuth({
  appName: process.env.SMTP_FROM_NAME ?? "Onigiroku",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 6,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      const payload = buildPasswordResetEmail({
        user: { name: user.name, email: user.email },
        url,
        locale: localeFromUser(user as { locale?: string }),
      });
      await sendBrandedEmail({
        to: user.email,
        subject: payload.subject,
        content: payload.content,
        text: payload.text,
      });
    },
    onPasswordReset: async ({ user }) => {
      const loginUrl = `${resolveAppOrigin()}/login`;
      const payload = buildPasswordChangedEmail({
        user: { name: user.name, email: user.email },
        loginUrl,
        locale: localeFromUser(user as { locale?: string }),
      });
      try {
        await sendBrandedEmail({
          to: user.email,
          subject: payload.subject,
          content: payload.content,
          text: payload.text,
        });
      } catch (error) {
        logger.error("Failed to send password-changed email", {
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const payload = buildVerificationEmail({
        user: { name: user.name, email: user.email },
        url,
        locale: localeFromUser(user as { locale?: string }),
      });
      await sendBrandedEmail({
        to: user.email,
        subject: payload.subject,
        content: payload.content,
        text: payload.text,
      });
    },
  },
  socialProviders: buildSocialProviders(),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
        input: false,
      },
      locale: {
        type: "string",
        required: false,
        defaultValue: "id",
        input: true,
      },
    },
  },
  /**
   * Sliding session: expires 7 days after last refresh.
   * Activity refreshes expiry at most once per hour (updateAge).
   * Idle ≥ 7 days → user must sign in again.
   */
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: Number(process.env.API_AUTH_RATE_LIMIT_MAX ?? 120),
  },
  trustedOrigins: resolveTrustedOrigins(),
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && !isSelfRegistrationEnabled()) {
        throw new APIError("FORBIDDEN", {
          message: "SELF_REGISTRATION_DISABLED",
        });
      }

      if (ctx.path === "/sign-in/email") {
        const email =
          typeof ctx.body?.email === "string" ? ctx.body.email : "";
        if (email) {
          try {
            await assertNotLockedOut(email);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "ACCOUNT_LOCKED";
            throw new APIError("FORBIDDEN", { message });
          }
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const email =
        typeof ctx.body?.email === "string" ? ctx.body.email : "";
      if (!email) return;

      const newSession = ctx.context.newSession;
      if (newSession) {
        await clearLockout(email);
        return;
      }

      const returnedError = ctx.context.returned;
      if (returnedError) {
        await recordFailedLogin(email);
      }
    }),
  },
  onAPIError: {
    onError(error) {
      logger.error("Better Auth API error", {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  },
});

export type Session = typeof auth.$Infer.Session;
