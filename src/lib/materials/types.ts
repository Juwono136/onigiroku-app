export type MaterialVisibility = "STUDENT" | "PUBLIC";
export type MaterialStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type MaterialTag = {
  id: string;
  slug: string;
  nameId: string;
  nameEn: string;
  usageCount?: number;
};

export type MaterialLocale = {
  locale: "id" | "en";
  title: string;
  excerpt: string;
  body: unknown;
  bodyText?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type MaterialListItem = {
  id: string;
  slug: string;
  visibility: MaterialVisibility | string;
  status: MaterialStatus | string;
  featured: boolean;
  coverObjectKey: string | null;
  coverUrl: string | null;
  authorId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  title: string;
  excerpt: string;
  tags: MaterialTag[];
};

export type MaterialDetail = MaterialListItem & {
  locales: MaterialLocale[];
};

export type MaterialListResult = {
  items: MaterialListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type MaterialLocaleInput = {
  locale: "id" | "en";
  title: string;
  excerpt?: string;
  body?: unknown;
  seoTitle?: string;
  seoDescription?: string;
};

export type MaterialTagInput = {
  nameId: string;
  nameEn?: string;
  slug?: string;
};

export type MaterialUpsertInput = {
  visibility: MaterialVisibility;
  status: MaterialStatus;
  featured?: boolean;
  coverObjectKey?: string | null;
  locales: MaterialLocaleInput[];
  tags?: MaterialTagInput[];
};

export type MaterialListQuery = {
  page: number;
  pageSize: number;
  search?: string;
  visibility?: MaterialVisibility | "ALL";
  status?: MaterialStatus | "ALL";
  /** Legacy single tag slug. Prefer `tags` for multi-select. */
  tag?: string;
  /** Multi-tag filter (OR). Sent as `tags=a,b` to Go. */
  tags?: string[];
  featured?: boolean;
  locale?: "id" | "en";
  sortBy?: "publishedAt" | "createdAt" | "updatedAt" | "title";
  sortDir?: "asc" | "desc";
};
