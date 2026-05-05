import { z } from "zod";

export const createPostSchema = z.object({
  subforumSlug: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9-]+$/i),
  title: z.string().trim().min(3, "Mínimo 3 caracteres").max(200, "Máximo 200 caracteres"),
  body: z.string().trim().min(1, "El cuerpo no puede estar vacío").max(20000, "Máximo 20.000 caracteres"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const updatePostSchema = createPostSchema
  .pick({ title: true, body: true })
  .extend({ id: z.coerce.number().int().positive() });

export type UpdatePostInput = z.infer<typeof updatePostSchema>;
