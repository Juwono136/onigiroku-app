export type LearningStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type QuestionType = "multiple_choice" | "short_answer" | "flashcard";

export type QuestionOptionInput = {
  labelId: string;
  labelEn: string;
  correct?: boolean;
};

export type QuestionInput = {
  type: QuestionType;
  promptId: string;
  promptEn: string;
  explanationId?: string;
  explanationEn?: string;
  acceptedAnswers?: string[];
  answerId?: string;
  answerEn?: string;
  options?: QuestionOptionInput[];
};

export type QuestionAdmin = QuestionInput & {
  id: string;
  position: number;
  options: Array<QuestionOptionInput & { id: string }>;
};

export type QuestionPublic = {
  id: string;
  type: QuestionType;
  position: number;
  promptId: string;
  promptEn: string;
  options: Array<{ id: string; labelId: string; labelEn: string }>;
  answerId?: string;
  answerEn?: string;
};

export type QuestionReview = QuestionPublic & {
  explanationId?: string;
  explanationEn?: string;
  answerId?: string;
  answerEn?: string;
  acceptedAnswers?: string[];
  correctOptionId?: string;
  correct: boolean;
  selectedOptionId?: string;
  textAnswer?: string;
  knew?: boolean | null;
};

export type LearningCategoryTag = {
  id: string;
  slug: string;
  nameId: string;
  nameEn: string;
  usageCount?: number;
};

export type LearningCategoryTagInput = {
  nameId: string;
  nameEn?: string;
  slug?: string;
};

export type LearningCategory = {
  id: string;
  slug: string;
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  coverObjectKey: string | null;
  coverUrl: string | null;
  position: number;
  status: LearningStatus;
  planKey: string;
  lessonCount: number;
  completedCount?: number;
  tags?: LearningCategoryTag[];
  createdAt: string;
  updatedAt: string;
};

export type CategoryListResult = {
  items: LearningCategory[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CategoryInput = {
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  coverObjectKey?: string | null;
  status: LearningStatus;
  planKey: string;
  tags?: LearningCategoryTagInput[];
};

export type PathLesson = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  position: number;
  status: string;
  coverUrl: string | null;
  locked: boolean;
  completed: boolean;
  inProgress: boolean;
  readingPercent: number;
};

export type StudentCategoryCard = {
  id: string;
  slug: string;
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  coverUrl: string | null;
  planKey: string;
  lessonCount: number;
  completedCount: number;
  tags?: LearningCategoryTag[];
};

export type StudentCategoryDetail = StudentCategoryCard & {
  lessons: PathLesson[];
  pathCompleted?: boolean;
  completion?: PathCompletion | null;
};

export type QuizAttemptSummary = {
  id: string;
  score: number;
  passed: boolean;
  createdAt: string;
  attemptNumber: number;
};

export type QuizAttemptListResult = {
  items: QuizAttemptSummary[];
  total: number;
  latestOnly: boolean;
};

export type QuizAttemptDetail = QuizAttemptSummary & {
  passScore: number;
  reviews: QuestionReview[];
};

export type PathLessonScore = {
  slug: string;
  title: string;
  position: number;
  completed: boolean;
  hasQuestions: boolean;
  passScore: number;
  latestScore: number | null;
  passed: boolean;
  attemptCount: number;
  readingOnly: boolean;
};

export type NextPathCard = {
  slug: string;
  nameId: string;
  nameEn: string;
  coverUrl: string | null;
  lessonCount: number;
  completedCount: number;
  planKey: string;
};

export type PathCompletion = {
  categorySlug: string;
  categoryNameId: string;
  categoryNameEn: string;
  lessonCount: number;
  completedCount: number;
  averageScore: number | null;
  lessons: PathLessonScore[];
  nextPath: NextPathCard | null;
};

export type LessonProgress = {
  status: string;
  readingPercent: number;
  completed: boolean;
};

export type StudentLessonView = {
  material: import("@/lib/materials/types").MaterialDetail;
  categorySlug: string;
  categoryNameId: string;
  categoryNameEn: string;
  completedCount: number;
  lessonCount: number;
  progress: LessonProgress;
  questions: QuestionPublic[];
  lessons: PathLesson[];
  nextSlug: string | null;
  nextLocked: boolean;
  pathCompleted?: boolean;
  completion?: PathCompletion | null;
};

export type QuizSubmitResult = {
  attemptId: string;
  score: number;
  passed: boolean;
  passScore: number;
  reviews: QuestionReview[];
  nextSlug: string | null;
  nextLocked: boolean;
  pathCompleted?: boolean;
  completion?: PathCompletion | null;
};
