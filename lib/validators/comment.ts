import { z } from "zod";

export const createCommentSchema = z.object({
  postId: z.coerce.number().int().positive(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  body: z.string().trim().min(1, "Escribe algo").max(5000, "Máximo 5.000 caracteres"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
