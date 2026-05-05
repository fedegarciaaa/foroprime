import { z } from "zod";

export const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(50).nullable(),
  bio: z.string().trim().max(280).nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
