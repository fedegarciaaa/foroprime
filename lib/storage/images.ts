import { createClient } from "@/lib/supabase/client";

export const MAX_IMAGES = 3;
export const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadPostImage(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("post-images").getPublicUrl(path);
  return data.publicUrl;
}
