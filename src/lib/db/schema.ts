import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Better Auth core tables + Onigiroku domain extensions.
 * Generate / sync with: npm run db:generate && npm run db:migrate
 */

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);

/** Account operational status (independent from soft-delete). */
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);

export const materialVisibilityEnum = pgEnum("material_visibility", [
  "STUDENT",
  "PUBLIC",
]);

export const materialStatusEnum = pgEnum("material_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("USER"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    locale: text("locale").notNull().default("id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Soft-delete timestamp; null = not in trash. Purge after 30 days. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    /**
     * Durable last successful sign-in. Survives session revoke/expiry so admin
     * Users Management does not lose "Last login" when status flips to Inactive.
     */
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [
    index("user_status_idx").on(t.status),
    index("user_deleted_at_idx").on(t.deletedAt),
    index("user_role_idx").on(t.role),
    index("user_last_login_at_idx").on(t.lastLoginAt),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("session_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("account_provider_account_uid").on(t.providerId, t.accountId),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const authLockout = pgTable("auth_lockout", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull().unique(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Learning materials / news (admin CMS). */
export const learningMaterial = pgTable(
  "learning_material",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    visibility: materialVisibilityEnum("visibility").notNull().default("STUDENT"),
    status: materialStatusEnum("status").notNull().default("DRAFT"),
    featured: boolean("featured").notNull().default(false),
    coverObjectKey: text("cover_object_key"),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("learning_material_slug_uid").on(t.slug),
    index("learning_material_vis_status_pub_idx").on(
      t.visibility,
      t.status,
      t.publishedAt,
    ),
    index("learning_material_deleted_at_idx").on(t.deletedAt),
    index("learning_material_author_idx").on(t.authorId),
  ],
);

export const learningMaterialLocale = pgTable(
  "learning_material_locale",
  {
    materialId: text("material_id")
      .notNull()
      .references(() => learningMaterial.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: jsonb("body").notNull().default({}),
    bodyText: text("body_text").notNull().default(""),
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Column order must match drizzle-kit introspection (locale, material_id).
    // Kit currently reads composite PK order incorrectly for this table; declaring
    // [materialId, locale] causes an infinite DROP/ADD PRIMARY KEY on every `db:push`.
    primaryKey({
      name: "learning_material_locale_material_id_locale_pk",
      columns: [t.locale, t.materialId],
    }),
    index("learning_material_locale_title_idx").on(t.title),
  ],
);

export const learningTag = pgTable(
  "learning_tag",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    nameId: text("name_id").notNull(),
    nameEn: text("name_en").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("learning_tag_slug_uid").on(t.slug)],
);

export const learningMaterialTag = pgTable(
  "learning_material_tag",
  {
    materialId: text("material_id")
      .notNull()
      .references(() => learningMaterial.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => learningTag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({
      name: "learning_material_tag_material_id_tag_id_pk",
      columns: [t.materialId, t.tagId],
    }),
    index("learning_material_tag_tag_idx").on(t.tagId),
  ],
);

export const schema = {
  user,
  session,
  account,
  verification,
  authLockout,
  learningMaterial,
  learningMaterialLocale,
  learningTag,
  learningMaterialTag,
};
