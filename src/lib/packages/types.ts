export type PackageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type FeatureType =
  | "learning_path"
  | "quiz"
  | "exam"
  | "private_class"
  | "practice";

export type PackageEntitlement = {
  id?: string;
  featureType: FeatureType | string;
  targetId: string | null;
  targetName?: string;
};

export type PackageBenefit = {
  textId: string;
  textEn: string;
};

export type ClassPackage = {
  id: string;
  slug: string;
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  benefits: PackageBenefit[];
  priceIdr: number;
  discountPercent: number;
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  effectivePriceIdr: number;
  discountActive: boolean;
  accessDurationDays: number | null;
  coverObjectKey: string | null;
  coverUrl: string | null;
  position: number;
  status: PackageStatus;
  entitlements: PackageEntitlement[];
  createdAt: string;
  updatedAt: string;
};

export type PackageListResult = {
  items: ClassPackage[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PackageUpsertInput = {
  nameId: string;
  nameEn: string;
  descriptionId: string;
  descriptionEn: string;
  benefits: PackageBenefit[];
  priceIdr: number;
  discountPercent: number;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  accessDurationDays?: number | null;
  coverObjectKey?: string | null;
  status: PackageStatus;
  entitlements: Array<{
    featureType: string;
    targetId: string | null;
  }>;
};

export type CheckoutResult = {
  orderId: string;
  invoiceNumber: string;
  amountIdr: number;
  currency: string;
  paymentUrl: string;
  provider: string;
};
