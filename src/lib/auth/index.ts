import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import {
  getAuthIdentityByEmail,
  isSocialOnlyIdentity,
  normalizeAuthEmail,
} from "@/lib/auth/account-identity";
import { throwAuthApiError } from "@/lib/auth/api-error";
import {
  assertNotLockedOut,
  clearLockout,
  recordFailedLogin,
} from "@/lib/auth/lockout";
import { assertPasswordComplexity } from "@/lib/auth/password-policy";
import { getDb } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { dispatchBrandedEmail } from "@/lib/email/dispatch";
import { localeFromCookieHeader, resolveEmailLocale } from "@/lib/email/locale";
import {
  buildExistingAccountSignUpEmail,
  buildPasswordChangedEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
} from "@/lib/email/templates/index";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";

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
      /**
       * Settings is the source of truth for profile photo/name after first signup.
       * Keep false so Google sign-in never restores a cleared/custom avatar.
       * First-time Google users still get picture via mapProfileToUser on create.
       */
      overrideUserInfoOnSignIn: false,
      mapProfileToUser: (profile: {
        name?: string | null;
        email?: string | null;
        picture?: string | null;
      }) => ({
        name: profile.name ?? undefined,
        image: profile.picture ?? undefined,
        email: profile.email ? normalizeAuthEmail(profile.email) : undefined,
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
  /**
   * One person = one `user` row. Google + email/password are linked accounts
   * on the same user (never a second user for the same email).
   * @see https://www.better-auth.com/docs/concepts/users-accounts#account-linking
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: false,
      // Keep true (OWASP): blocks takeover if attacker registered unverified email
      // then victim signs in with Google. Victim must verify email first, or use Google-first.
      requireLocalEmailVerified: true,
      // Don't overwrite Settings edits when linking Google to an existing user.
      updateUserInfoOnLink: false,
      disableImplicitLinking: false,
    },
    updateAccountOnSignIn: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (data) => {
          if (typeof data.email === "string") {
            data.email = normalizeAuthEmail(data.email);
          }
          return { data };
        },
      },
      update: {
        before: async (data) => {
          if (typeof data.email === "string") {
            data.email = normalizeAuthEmail(data.email);
          }
          return { data };
        },
      },
    },
    session: {
      create: {
        before: async (sessionData) => {
          try {
            const { assertUserIdCanAuthenticate } = await import(
              "@/lib/admin/users"
            );
            await assertUserIdCanAuthenticate(sessionData.userId);
          } catch (error) {
            const code =
              error instanceof Error ? error.message : "ACCOUNT_INACTIVE";
            // Must include `code` so OAuth callback redirects to login UI
            // instead of rendering raw JSON in the browser.
            if (code === "ACCOUNT_DELETED") {
              throwAuthApiError("FORBIDDEN", "ACCOUNT_DELETED");
            }
            if (code === "USER_NOT_FOUND") {
              throwAuthApiError("FORBIDDEN", "USER_NOT_FOUND");
            }
            throwAuthApiError("FORBIDDEN", "ACCOUNT_INACTIVE");
          }
          return { data: sessionData };
        },
        after: async (session) => {
          // Persist durable last-login so admin UI survives session revoke/expiry.
          try {
            const db = getDb();
            await db
              .update(schema.user)
              .set({ lastLoginAt: new Date() })
              .where(eq(schema.user.id, session.userId));
          } catch (error) {
            logger.warn("Failed to persist last_login_at", {
              userId: session.userId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 6,
    maxPasswordLength: 128,
    /**
     * When email already exists (often Google-first), Better Auth returns a
     * generic sign-up success (anti-enumeration). Notify the real owner instead
     * of creating a duplicate user.
     */
    onExistingUserSignUp: async ({ user }, request) => {
      const identity = await getAuthIdentityByEmail(user.email);
      const locale = resolveEmailLocale(
        user as { locale?: string },
        request ?? null,
      );
      const origin = resolveAppOrigin();
      const payload = buildExistingAccountSignUpEmail({
        user: { name: user.name, email: user.email },
        loginUrl: `${origin}/login`,
        forgotPasswordUrl: `${origin}/forgot-password`,
        hasGoogle: identity?.hasGoogle ?? false,
        hasCredential: identity?.hasCredential ?? false,
        locale,
      });
      dispatchBrandedEmail({
        to: user.email,
        subject: payload.subject,
        content: payload.content,
        text: payload.text,
      });
    },
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
      status: {
        type: "string",
        required: false,
        defaultValue: "ACTIVE",
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

        const body = ctx.body as Record<string, unknown> | undefined;
        if (body && typeof body.email === "string") {
          body.email = normalizeAuthEmail(body.email);
        }
        if (body && typeof body.password === "string") {
          try {
            assertPasswordComplexity(body.password);
          } catch (error) {
            throw new APIError("BAD_REQUEST", {
              message:
                error instanceof Error ? error.message : "PASSWORD_MIN",
            });
          }
        }
        if (body && (body.locale === undefined || body.locale === "")) {
          const fromCookie = localeFromCookieHeader(
            ctx.headers?.get("cookie") ?? null,
          );
          if (fromCookie) {
            body.locale = fromCookie;
          }
        }
      }

      if (ctx.path === "/reset-password") {
        const body = ctx.body as Record<string, unknown> | undefined;
        const password =
          typeof body?.newPassword === "string"
            ? body.newPassword
            : typeof body?.password === "string"
              ? body.password
              : "";
        if (password) {
          try {
            assertPasswordComplexity(password);
          } catch (error) {
            throw new APIError("BAD_REQUEST", {
              message:
                error instanceof Error ? error.message : "PASSWORD_MIN",
            });
          }
        }
      }

      if (ctx.path === "/sign-in/email") {
        const emailRaw =
          typeof ctx.body?.email === "string" ? ctx.body.email : "";
        const email = normalizeAuthEmail(emailRaw);
        if (email && ctx.body && typeof ctx.body === "object") {
          (ctx.body as { email?: string }).email = email;
        }

        if (email) {
          try {
            await assertNotLockedOut(email);
          } catch {
            throwAuthApiError("FORBIDDEN", "ACCOUNT_LOCKED");
          }

          try {
            const { assertUserCanAuthenticate } = await import(
              "@/lib/admin/users"
            );
            await assertUserCanAuthenticate(email);
          } catch (error) {
            const code =
              error instanceof Error ? error.message : "ACCOUNT_INACTIVE";
            throwAuthApiError(
              "FORBIDDEN",
              code === "ACCOUNT_DELETED" ? "ACCOUNT_DELETED" : "ACCOUNT_INACTIVE",
            );
          }

          // Google-only account: guide user instead of opaque invalid-password.
          try {
            const identity = await getAuthIdentityByEmail(email);
            if (identity && isSocialOnlyIdentity(identity)) {
              throwAuthApiError("BAD_REQUEST", "USE_GOOGLE_OR_RESET_PASSWORD");
            }
          } catch (error) {
            if (error instanceof APIError) throw error;
            logger.warn("Identity lookup failed during sign-in", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      if (ctx.path === "/request-password-reset") {
        const body = ctx.body as Record<string, unknown> | undefined;
        if (body && typeof body.email === "string") {
          body.email = normalizeAuthEmail(body.email);
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const email =
        typeof ctx.body?.email === "string"
          ? normalizeAuthEmail(ctx.body.email)
          : "";
      if (!email) return;

      const newSession = ctx.context.newSession;
      if (newSession) {
        await clearLockout(email);
        return;
      }

      const returnedError = ctx.context.returned;
      if (returnedError) {
        // Don't count guided social-only errors as lockout failures.
        const message =
          returnedError instanceof Error
            ? returnedError.message
            : String(
                (returnedError as { message?: string } | null)?.message ?? "",
              );
        if (message.includes("USE_GOOGLE_OR_RESET_PASSWORD")) return;
        await recordFailedLogin(email);
      }
    }),
  },
  onAPIError: {
    // OAuth failures (e.g. account_not_linked) land on login with ?error=
    errorURL: `${resolveAppOrigin()}/login`,
    onError(error) {
      logger.error("Better Auth API error", {
        error: error instanceof Error ? error.message : String(error),
      });
    },
  },
});

export type Session = typeof auth.$Infer.Session;
