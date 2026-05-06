"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, ERR, type ActionResult } from "@/lib/actions/result";
import { Resend } from "resend";
import { REPORT_REASONS } from "@/lib/reports-config";

export async function reportPost(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const postId = Number(formData.get("postId"));
  const reason = formData.get("reason") as string;
  const comment = ((formData.get("comment") as string) ?? "").trim() || null;

  if (!Number.isFinite(postId) || postId <= 0) return fail(ERR.INVALID_INPUT);
  if (!REPORT_REASONS.some((r) => r.value === reason)) return fail(ERR.INVALID_INPUT);

  const { error } = await supabase.from("reports").insert({
    post_id: postId,
    reporter_id: user.id,
    reason,
    comment,
  });

  if (error) {
    if (error.code === "23505") return fail("Ya has denunciado este post anteriormente");
    if (error.code === "42501" || error.code === "P0001") return fail(ERR.FORBIDDEN);
    console.error("reportPost insert error", error);
    return fail(ERR.UNKNOWN);
  }

  // Enviar email al administrador si Resend está configurado
  await sendReportEmail({ postId, reason, comment, reporterId: user.id });

  return ok(undefined);
}

async function sendReportEmail({
  postId,
  reason,
  comment,
  reporterId,
}: {
  postId: number;
  reason: string;
  comment: string | null;
  reporterId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !adminEmail) return;

  try {
    const supabase = await createClient();

    const [{ data: post }, { data: reporter }] = await Promise.all([
      supabase.from("posts").select("title, slug, subforum:subforums(slug)").eq("id", postId).single(),
      supabase.from("profiles").select("username").eq("id", reporterId).single(),
    ]);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foroprime.vercel.app";
    const postUrl = `${siteUrl}/p/${postId}/${post?.slug ?? ""}`;
    const adminUrl = `${siteUrl}/admin/denuncias`;
    const reasonLabel = REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "ForoPrime <onboarding@resend.dev>",
      to: adminEmail,
      subject: `⚠️ Nueva denuncia en ForoPrime: ${reasonLabel}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#e85d04">⚠️ Nueva denuncia recibida</h2>

          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr>
              <td style="padding:8px;color:#666;width:140px">Post</td>
              <td style="padding:8px"><a href="${postUrl}" style="color:#e85d04">${post?.title ?? `#${postId}`}</a></td>
            </tr>
            <tr style="background:#f9f9f9">
              <td style="padding:8px;color:#666">Motivo</td>
              <td style="padding:8px"><strong>${reasonLabel}</strong></td>
            </tr>
            <tr>
              <td style="padding:8px;color:#666">Denunciado por</td>
              <td style="padding:8px">@${reporter?.username ?? reporterId}</td>
            </tr>
            ${comment ? `
            <tr style="background:#f9f9f9">
              <td style="padding:8px;color:#666">Comentario</td>
              <td style="padding:8px">${comment}</td>
            </tr>` : ""}
          </table>

          <div style="margin-top:24px;display:flex;gap:12px">
            <a href="${postUrl}" style="display:inline-block;background:#e85d04;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin-right:12px">
              Ver post
            </a>
            <a href="${adminUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
              Panel de denuncias
            </a>
          </div>

          <p style="margin-top:32px;color:#999;font-size:12px">ForoPrime · Comunidad sobre PRIME</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("sendReportEmail error", err);
  }
}

export async function resolveReport(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(ERR.UNAUTHENTICATED);

  const reportId = Number(formData.get("reportId"));
  const deletePost = formData.get("deletePost") === "true";

  if (!Number.isFinite(reportId) || reportId <= 0) return fail(ERR.INVALID_INPUT);

  // Si se marca para eliminar, hacer soft-delete del post
  if (deletePost) {
    const { data: report } = await supabase
      .from("reports")
      .select("post_id")
      .eq("id", reportId)
      .single();

    if (report) {
      const { error } = await supabase
        .from("posts")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", report.post_id);
      if (error) return fail(ERR.FORBIDDEN);
    }
  }

  // Marcar denuncia como resuelta
  const { error } = await supabase
    .from("reports")
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq("id", reportId);

  if (error) return fail(ERR.FORBIDDEN);

  revalidatePath("/admin/denuncias");
  revalidatePath("/", "layout");
  return ok(undefined);
}
