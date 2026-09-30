import { z } from "zod";

export const contactInterestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80).optional(),
  locale: z.enum(["id", "en"]).default("id"),
  source: z.string().max(64).optional(),
});

export type ContactInterestInput = z.infer<typeof contactInterestSchema>;
