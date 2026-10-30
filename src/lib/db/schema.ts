import { sql } from "drizzle-orm";
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

export const learningCategoryStatusEnum = pgEnum("learning_category_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const learningQuestionTypeEnum = pgEnum("learning_question_type", [
  "multiple_choice",
  "short_answer",
  "flashcard",
]);

export const learningProgressStatusEnum = pgEnum("learning_progress_status", [
  "in_progress",
  "completed",
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
    categoryId: text("category_id").references(() => learningCategory.id, {
      onDelete: "restrict",
    }),
    position: integer("position"),
    passScore: integer("pass_score").notNull().default(80),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
    shuffleChoices: boolean("shuffle_choices").notNull().default(false),
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
    // drizzle-kit 0.31 reads composite PK columns from constraint_column_usage
    // without ordinal_position, so the order it "sees" is not the real key order.
    // These arrays follow that read (stable here: reverse alphabetical). The
    // database key itself stays as created by migrations. Swapping them back
    // makes `db:push` drop and recreate the same primary key forever.
    primaryKey({
      name: "learning_material_locale_material_id_locale_pk",
      columns: [t.materialId, t.locale],
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
    // Column order matches drizzle-kit's unordered PK read. See learningMaterialLocale.
    primaryKey({
      name: "learning_material_tag_material_id_tag_id_pk",
      columns: [t.tagId, t.materialId],
    }),
    index("learning_material_tag_tag_idx").on(t.tagId),
  ],
);

export const learningCategory = pgTable(
  "learning_category",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    nameId: text("name_id").notNull(),
    nameEn: text("name_en").notNull().default(""),
    descriptionId: text("description_id").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    coverObjectKey: text("cover_object_key"),
    position: integer("position").notNull().default(0),
    status: learningCategoryStatusEnum("status").notNull().default("DRAFT"),
    planKey: text("plan_key").notNull().default("free"),
    /** Incremented when a signed-in student opens this learning path (popularity). */
    studentViewCount: integer("student_view_count").notNull().default(0),
    lastStudentAccessAt: timestamp("last_student_access_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("learning_category_slug_uid")
      .on(t.slug)
      .where(sql`${t.deletedAt} IS NULL`),
    index("learning_category_status_pos_idx").on(t.status, t.position),
  ],
);

/** Category ↔ tag join (max 5 tags per learning path; shared learning_tag catalog). */
export const learningCategoryTag = pgTable(
  "learning_category_tag",
  {
    categoryId: text("category_id")
      .notNull()
      .references(() => learningCategory.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => learningTag.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({
      name: "learning_category_tag_category_id_tag_id_pk",
      columns: [t.tagId, t.categoryId],
    }),
    index("learning_category_tag_tag_idx").on(t.tagId),
  ],
);

export const learningQuestion = pgTable(
  "learning_question",
  {
    id: text("id").primaryKey(),
    materialId: text("material_id")
      .notNull()
      .references(() => learningMaterial.id, { onDelete: "cascade" }),
    type: learningQuestionTypeEnum("type").notNull(),
    position: integer("position").notNull(),
    promptId: text("prompt_id").notNull(),
    promptEn: text("prompt_en").notNull().default(""),
    explanationId: text("explanation_id").notNull().default(""),
    explanationEn: text("explanation_en").notNull().default(""),
    acceptedAnswers: jsonb("accepted_answers").notNull().default([]),
    answerId: text("answer_id").notNull().default(""),
    answerEn: text("answer_en").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("learning_question_material_pos_uid").on(t.materialId, t.position),
  ],
);

export const learningQuestionOption = pgTable(
  "learning_question_option",
  {
    id: text("id").primaryKey(),
    questionId: text("question_id")
      .notNull()
      .references(() => learningQuestion.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    labelId: text("label_id").notNull(),
    labelEn: text("label_en").notNull().default(""),
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (t) => [index("learning_question_option_question_idx").on(t.questionId, t.position)],
);

export const learningLessonProgress = pgTable(
  "learning_lesson_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => learningMaterial.id, { onDelete: "cascade" }),
    status: learningProgressStatusEnum("status").notNull().default("in_progress"),
    readingPercent: integer("reading_percent").notNull().default(0),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({
      name: "learning_lesson_progress_pk",
      columns: [t.userId, t.materialId],
    }),
  ],
);

export const learningQuizAttempt = pgTable("learning_quiz_attempt", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  materialId: text("material_id")
    .notNull()
    .references(() => learningMaterial.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  passed: boolean("passed").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const learningQuizAnswer = pgTable(
  "learning_quiz_answer",
  {
    attemptId: text("attempt_id")
      .notNull()
      .references(() => learningQuizAttempt.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => learningQuestion.id, { onDelete: "cascade" }),
    selectedOptionId: text("selected_option_id"),
    textAnswer: text("text_answer").notNull().default(""),
    knew: boolean("knew"),
    correct: boolean("correct").notNull(),
  },
  (t) => [
    // Column order matches drizzle-kit's unordered PK read. See learningMaterialLocale.
    primaryKey({
      name: "learning_quiz_answer_pk",
      columns: [t.questionId, t.attemptId],
    }),
  ],
);

export const userLearningAccess = pgTable(
  "user_learning_access",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planKey: text("plan_key").notNull(),
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("manual"),
    externalRef: text("external_ref").notNull().default(""),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("user_learning_access_user_plan_idx").on(t.userId, t.planKey, t.status),
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
  learningCategory,
  learningCategoryTag,
  learningQuestion,
  learningQuestionOption,
  learningLessonProgress,
  learningQuizAttempt,
  learningQuizAnswer,
  userLearningAccess,
};
