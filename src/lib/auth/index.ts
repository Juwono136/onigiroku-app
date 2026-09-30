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
import { dispatchBrandedEmail } from "@/lib/email/dispatch";
import { localeFromCookieHeader, resolveEmailLocale } from "@/lib/email/locale";
import {
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
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
      // Refresh name/avatar from Google on every sign-in (fixes missing image).
      overrideUserInfoOnSignIn: true,
      mapProfileToUser: (profile: {
        name?: string | null;
        email?: string | null;
        picture?: string | null;
      }) => ({
        name: profile.name ?? undefined,
        image: profile.picture ?? undefined,
        email: profile.email ?? undefined,
      }),
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
    sendResetPassword: async ({ user, url }, request) => {
      const locale = resolveEmailLocale(
        user as { locale?: string },
        request ?? null,
      );
      const payload = buildPasswordResetEmail({
        user: { name: user.name, email: user.email },
        url,
        locale,
      });
      // Non-blocking — Gmail SMTP must not stall the auth API response.
      dispatchBrandedEmail({
        to: user.email,
        subject: payload.subject,
        content: payload.content,
        text: payload.text,
      });
    },
    onPasswordReset: async ({ user }, request) => {
      const loginUrl = `${resolveAppOrigin()}/login`;
      const locale = resolveEmailLocale(
        user as { locale?: string },
        request ?? null,
      );
      const payload = buildPasswordChangedEmail({
        user: { name: user.name, email: user.email },
        loginUrl,
        locale,
      });
      dispatchBrandedEmail({
        to: user.email,
        subject: payload.subject,
        content: payload.content,
        text: payload.text,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      const locale = resolveEmailLocale(
        user as { locale?: string },
        request ?? null,
      );
      const payload = buildVerificationEmail({
        user: { name: user.name, email: user.email },
        url,
        locale,
      });
      dispatchBrandedEmail({
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
      if (ctx.path === "/sign-up/email") {
        if (!isSelfRegistrationEnabled()) {
          throw new APIError("FORBIDDEN", {
            message: "SELF_REGISTRATION_DISABLED",
          });
        }

        // Ensure locale follows website preference when client omits it.
        const body = ctx.body as Record<string, unknown> | undefined;
        if (body && (body.locale === undefined || body.locale === "")) {
          const fromCookie = localeFromCookieHeader(
            ctx.headers?.get("cookie") ?? null,
          );
          if (fromCookie) {
            body.locale = fromCookie;
          }
        }
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
