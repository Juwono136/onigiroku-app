import { z } from "zod";

const PLACEHOLDER_FRAGMENTS = [
  "replace_with",
  "replace_me",
  "changeme",
  "your_",
  "<password>",
  "<redis_password>",
  "<storage_password>",
  "<health_token>",
  "<xendit",
  "xxxxx",
  "example.com",
  "dev_only",
  "dev_internal",
] as const;

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === "boolean") return value;
    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

function looksLikePlaceholder(value: string) {
  const lower = value.toLowerCase();
  return PLACEHOLDER_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

const redisUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("redis://") || value.startsWith("rediss://"),
    "REDIS_URL must start with redis:// or rediss:// (TLS)",
  )
  .refine((value) => {
    // Prefer passworded form: redis://:password@host:6379
    try {
      const parsed = new URL(value);
      return Boolean(parsed.hostname);
    } catch {
      return false;
    }
  }, "REDIS_URL must be a valid Redis connection URL");

const postgresUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL must start with postgres:// or postgresql://",
  );

const baseServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_STORAGE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SELF_REGISTRATION_ENABLED: booleanFromString.default(true),
  API_PORT: z.coerce.number().int().positive().default(8080),
  CORS_ORIGINS: z.string().optional().default("http://localhost:3000"),
  APP_URL: z.string().optional().default(""),

  DATABASE_URL: postgresUrlSchema,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_POOL_MIN: z.coerce.number().int().min(0).max(50).default(1),
  DATABASE_POOL_IDLE_TIMEOUT_SEC: z.coerce
    .number()
    .int()
    .min(1)
    .max(3600)
    .default(20),

  REDIS_URL: redisUrlSchema,

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  AUTH_LOCKOUT_ENABLED: booleanFromString.default(true),
  AUTH_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  AUTH_LOCKOUT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(86_400)
    .default(900),
  AUTH_LOCKOUT_DURATION_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .max(86_400)
    .default(1800),
  SELF_REGISTRATION_ENABLED: booleanFromString.default(true),
  BETTER_AUTH_SESSION_COOKIE: z
    .string()
    .min(1)
    .default("better-auth.session_token"),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  AUTH_TRUSTED_ORIGINS: z.string().optional().default(""),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),
  SMTP_REPLY_TO: z.string().email().optional().or(z.literal("")),
  SMTP_FROM_NAME: z.string().min(1).default("Onigiroku"),
  EMAIL_LOGO_URL: z
    .union([z.string().url(), z.literal("")])
    .optional()
    .default(""),
  SALES_NOTIFY_EMAIL: z
    .union([z.string().email(), z.literal("")])
    .optional()
    .default(""),

  STORAGE_ALLOW_LOCALHOST: booleanFromString.default(true),
  STORAGE_AUTH_MODE: z.enum(["none", "nginx-basic"]).default("nginx-basic"),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().default("us-east-1"),
  USERNAME_STORAGE: z.string().optional().default(""),
  PASSWORD_STORAGE: z.string().optional().default(""),

  GIN_MODE: z.enum(["debug", "release", "test"]).or(z.string()).default("debug"),
  API_READ_TIMEOUT: z.string().default("15s"),
  API_WRITE_TIMEOUT: z.string().default("30s"),
  API_IDLE_TIMEOUT: z.string().default("60s"),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(30).max(10_000).default(300),
  API_AUTH_RATE_LIMIT_MAX: z.coerce
    .number()
    .int()
    .min(10)
    .max(2000)
    .default(120),
  INTERNAL_API_SECRET: z.string().min(16),

  XENDIT_SECRET_KEY: z.string().optional().default(""),
  XENDIT_CALLBACK_TOKEN: z.string().optional().default(""),
  XENDIT_PUBLIC_KEY: z.string().optional().default(""),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  HEALTH_CHECK_TOKEN: z.string().optional().default(""),
});

export type ServerEnv = z.infer<typeof baseServerEnvSchema>;

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_STORAGE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SELF_REGISTRATION_ENABLED: booleanFromString.optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function readProcessEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
    NEXT_PUBLIC_SELF_REGISTRATION_ENABLED:
      process.env.NEXT_PUBLIC_SELF_REGISTRATION_ENABLED,
    API_PORT: process.env.API_PORT,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
    DATABASE_POOL_MIN: process.env.DATABASE_POOL_MIN,
    DATABASE_POOL_IDLE_TIMEOUT_SEC: process.env.DATABASE_POOL_IDLE_TIMEOUT_SEC,
    REDIS_URL: process.env.REDIS_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AUTH_LOCKOUT_ENABLED: process.env.AUTH_LOCKOUT_ENABLED,
    AUTH_LOCKOUT_MAX_ATTEMPTS: process.env.AUTH_LOCKOUT_MAX_ATTEMPTS,
    AUTH_LOCKOUT_WINDOW_SECONDS: process.env.AUTH_LOCKOUT_WINDOW_SECONDS,
    AUTH_LOCKOUT_DURATION_SECONDS: process.env.AUTH_LOCKOUT_DURATION_SECONDS,
    SELF_REGISTRATION_ENABLED: process.env.SELF_REGISTRATION_ENABLED,
    BETTER_AUTH_SESSION_COOKIE: process.env.BETTER_AUTH_SESSION_COOKIE,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    AUTH_TRUSTED_ORIGINS: process.env.AUTH_TRUSTED_ORIGINS,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    SMTP_REPLY_TO: process.env.SMTP_REPLY_TO,
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME,
    EMAIL_LOGO_URL: process.env.EMAIL_LOGO_URL,
    SALES_NOTIFY_EMAIL: process.env.SALES_NOTIFY_EMAIL,
    STORAGE_ALLOW_LOCALHOST: process.env.STORAGE_ALLOW_LOCALHOST,
    STORAGE_AUTH_MODE: process.env.STORAGE_AUTH_MODE,
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
    STORAGE_REGION: process.env.STORAGE_REGION,
    USERNAME_STORAGE: process.env.USERNAME_STORAGE,
    PASSWORD_STORAGE: process.env.PASSWORD_STORAGE,
    GIN_MODE: process.env.GIN_MODE,
    API_READ_TIMEOUT: process.env.API_READ_TIMEOUT,
    API_WRITE_TIMEOUT: process.env.API_WRITE_TIMEOUT,
    API_IDLE_TIMEOUT: process.env.API_IDLE_TIMEOUT,
    API_RATE_LIMIT_MAX: process.env.API_RATE_LIMIT_MAX,
    API_AUTH_RATE_LIMIT_MAX: process.env.API_AUTH_RATE_LIMIT_MAX,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
    XENDIT_SECRET_KEY: process.env.XENDIT_SECRET_KEY,
    XENDIT_CALLBACK_TOKEN: process.env.XENDIT_CALLBACK_TOKEN,
    XENDIT_PUBLIC_KEY: process.env.XENDIT_PUBLIC_KEY,
    LOG_LEVEL: process.env.LOG_LEVEL,
    HEALTH_CHECK_TOKEN: process.env.HEALTH_CHECK_TOKEN,
  };
}

function applyProductionGuards(env: ServerEnv) {
  if (env.NODE_ENV !== "production") {
    return env;
  }

  const errors: string[] = [];

  for (const [key, value] of Object.entries({
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    INTERNAL_API_SECRET: env.INTERNAL_API_SECRET,
    HEALTH_CHECK_TOKEN: env.HEALTH_CHECK_TOKEN,
    SMTP_PASS: env.SMTP_PASS,
  })) {
    if (!value || looksLikePlaceholder(value)) {
      errors.push(`${key} must be a strong non-placeholder secret in production`);
    }
  }

  if (env.HEALTH_CHECK_TOKEN.length < 16) {
    errors.push("HEALTH_CHECK_TOKEN must be at least 16 characters in production");
  }

  if (!isHttpsUrl(env.NEXT_PUBLIC_APP_URL) || !isHttpsUrl(env.BETTER_AUTH_URL)) {
    errors.push(
      "NEXT_PUBLIC_APP_URL and BETTER_AUTH_URL must use HTTPS in production",
    );
  }

  if (env.NEXT_PUBLIC_SITE_URL && !isHttpsUrl(env.NEXT_PUBLIC_SITE_URL)) {
    errors.push("NEXT_PUBLIC_SITE_URL must use HTTPS in production");
  }

  if (env.STORAGE_ALLOW_LOCALHOST) {
    errors.push("STORAGE_ALLOW_LOCALHOST must be false in production");
  }

  if (env.STORAGE_AUTH_MODE === "nginx-basic") {
    if (!env.USERNAME_STORAGE || !env.PASSWORD_STORAGE) {
      errors.push(
        "USERNAME_STORAGE and PASSWORD_STORAGE are required when STORAGE_AUTH_MODE=nginx-basic",
      );
    }
  }

  if (env.GIN_MODE !== "release") {
    errors.push('GIN_MODE should be "release" in production');
  }

  if (env.LOG_LEVEL === "debug") {
    errors.push('LOG_LEVEL should not be "debug" in production');
  }

  if (env.EMAIL_LOGO_URL && !isHttpsUrl(env.EMAIL_LOGO_URL)) {
    errors.push("EMAIL_LOGO_URL must use HTTPS in production");
  }

  // Prefer authenticated Redis in production
  try {
    const redis = new URL(env.REDIS_URL);
    if (!redis.password) {
      errors.push(
        "REDIS_URL must include a password in production (redis://:<password>@host:6379)",
      );
    }
  } catch {
    errors.push("REDIS_URL is invalid");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid production environment:\n- ${errors.join("\n- ")}`);
  }

  return env;
}

let cachedServerEnv: ServerEnv | null = null;

/**
 * Strict server env validation for auth, email, storage, billing, and API routes.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = baseServerEnvSchema.safeParse(readProcessEnv());
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  if (parsed.data.DATABASE_POOL_MIN > parsed.data.DATABASE_POOL_MAX) {
    throw new Error("DATABASE_POOL_MIN cannot exceed DATABASE_POOL_MAX");
  }

  cachedServerEnv = applyProductionGuards(parsed.data);
  return cachedServerEnv;
}

/**
 * Soft parse for diagnostics (scripts/preflight). Does not throw production guards.
 */
export function parseServerEnvSafe() {
  return baseServerEnvSchema.safeParse(readProcessEnv());
}

export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
    NEXT_PUBLIC_SELF_REGISTRATION_ENABLED:
      process.env.NEXT_PUBLIC_SELF_REGISTRATION_ENABLED,
  });

  if (!parsed.success) {
    throw new Error("Invalid public environment variables");
  }

  return parsed.data;
}

export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_GO_API_URL ??
    process.env.GO_API_URL ??
    `http://localhost:${process.env.API_PORT ?? "8080"}`
  );
}

export function isProduction() {
  return (process.env.NODE_ENV ?? "development") === "production";
}

export function isSelfRegistrationEnabled() {
  const server = process.env.SELF_REGISTRATION_ENABLED;
  const pub = process.env.NEXT_PUBLIC_SELF_REGISTRATION_ENABLED;
  const toBool = (v?: string) =>
    v == null ? true : ["1", "true", "yes", "on"].includes(v.toLowerCase());
  return toBool(server) && toBool(pub);
}
