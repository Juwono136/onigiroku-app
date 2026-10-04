import { z } from "zod";

import { USER_ROLES } from "@/lib/auth/roles";

export const adminUsersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(10),
  search: z.string().trim().max(120).optional().default(""),
  role: z.enum([...USER_ROLES, "ALL"] as const).default("ALL"),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ALL"),
  scope: z.enum(["active", "trash"]).default("active"),
  sortBy: z
    .enum(["name", "email", "role", "status", "createdAt", "lastLoginAt"])
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .refine((value) => value.role !== undefined || value.status !== undefined, {
    message: "At least one of role or status is required",
  });

export const adminUserIdParamSchema = z.object({
  userId: z.string().min(1).max(128),
});

export type AdminUsersListQuery = z.infer<typeof adminUsersListQuerySchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
