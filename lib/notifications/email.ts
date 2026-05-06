import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://foroprime.vercel.app";
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "ForoPrime <onboarding@resend.dev>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function unsubscribeLink() {
  return `${siteUrl}/u/ajustes#notificaciones`;
}

function footer() {
  return `
    <p style="margin-top:32px;color:#999;font-size:12px;border-top:1px solid #eee;padding-top:16px">
      ForoPrime · Comunidad sobre PRIME<br>
      <a href="${unsubscribeLink()}" style="color:#999">Gestionar notificaciones</a>
    </p>
  `;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type Recipient = {
  email: string;
  username: string;
};

// ─── Helpers para leer datos con admin client ─────────────────────────────────

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

async function getPostSubscriberEmails(
  postId: number,
  excludeIds: string[],
): Promise<Recipient[]> {
  try {
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("post_subscriptions")
      .select("user_id, profiles!inner(username, banned_at)")
      .eq("post_id", postId)
      .not("user_id", "in", `(${excludeIds.map(id => `"${id}"`).join(",")})`);


    if (!subs?.length) return [];

    const recipients: Recipient[] = [];
    for (const sub of subs) {
      const profile = sub.profiles as unknown as { username: string; banned_at: string | null };
      if (profile.banned_at) continue;

      // Comprobar preferencias
      const { data: prefs } = await admin
        .from("notification_preferences")
        .select("email_enabled, email_on_post_comment")
        .eq("user_id", sub.user_id)
        .maybeSingle();

      // Si no hay preferencias, por defecto todo activo
      if (prefs && (!prefs.email_enabled || !prefs.email_on_post_comment)) continue;

      const email = await getUserEmail(sub.user_id);
      if (email) recipients.push({ email, username: profile.username });
    }
    return recipients;
  } catch (err) {
    console.error("getPostSubscriberEmails error", err);
    return [];
  }
}

// ─── Envío de emails ──────────────────────────────────────────────────────────

export async function notifyPostSubscribers({
  postId,
  postTitle,
  postSlug,
  commenterUsername,
  commentId,
  excludeUserId,
  extraExcludeIds = [],
}: {
  postId: number;
  postTitle: string;
  postSlug: string;
  commenterUsername: string;
  commentId: number;
  excludeUserId: string;
  extraExcludeIds?: string[];
}) {
  const resend = getResend();
  if (!resend) return;

  const excludeIds = Array.from(new Set([excludeUserId, ...extraExcludeIds]));
  const recipients = await getPostSubscriberEmails(postId, excludeIds);
  if (!recipients.length) return;

  const postUrl = `${siteUrl}/p/${postId}/${postSlug}#comment-${commentId}`;

  for (const r of recipients) {
    await resend.emails.send({
      from: fromEmail,
      to: r.email,
      subject: `💬 Nuevo comentario en "${postTitle}"`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#e85d04">Nuevo comentario en un post que sigues</h2>
          <p><strong>@${commenterUsername}</strong> ha comentado en <strong>${postTitle}</strong>.</p>
          <div style="margin:20px 0">
            <a href="${postUrl}" style="display:inline-block;background:#e85d04;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
              Ver comentario
            </a>
          </div>
          ${footer()}
        </div>
      `,
    }).catch(err => console.error("notifyPostSubscribers send error", err));
  }
}

export async function notifyCommentReply({
  parentAuthorId,
  postId,
  postTitle,
  postSlug,
  commentId,
  replierUsername,
  replyExcerpt,
}: {
  parentAuthorId: string;
  postId: number;
  postTitle: string;
  postSlug: string;
  commentId: number;
  replierUsername: string;
  replyExcerpt: string;
}) {
  const resend = getResend();
  if (!resend) return;

  try {
    const admin = createAdminClient();

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_enabled, email_on_comment_reply")
      .eq("user_id", parentAuthorId)
      .maybeSingle();

    if (prefs && (!prefs.email_enabled || !prefs.email_on_comment_reply)) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("banned_at")
      .eq("id", parentAuthorId)
      .single();
    if (profile?.banned_at) return;

    const email = await getUserEmail(parentAuthorId);
    if (!email) return;

    const commentUrl = `${siteUrl}/p/${postId}/${postSlug}#comment-${commentId}`;

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `↩️ @${replierUsername} ha respondido a tu comentario`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#e85d04">Han respondido a tu comentario</h2>
          <p><strong>@${replierUsername}</strong> ha respondido a tu comentario en <strong>${postTitle}</strong>.</p>
          ${replyExcerpt ? `
          <blockquote style="border-left:3px solid #e85d04;margin:16px 0;padding:8px 16px;color:#555;font-style:italic">
            ${replyExcerpt.slice(0, 200)}${replyExcerpt.length > 200 ? "…" : ""}
          </blockquote>` : ""}
          <div style="margin:20px 0">
            <a href="${commentUrl}" style="display:inline-block;background:#e85d04;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
              Ver respuesta
            </a>
          </div>
          ${footer()}
        </div>
      `,
    });
  } catch (err) {
    console.error("notifyCommentReply error", err);
  }
}

export async function notifyPostDeleted({
  authorId,
  postTitle,
}: {
  authorId: string;
  postTitle: string;
}) {
  const resend = getResend();
  if (!resend) return;

  try {
    const admin = createAdminClient();

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_enabled, email_on_post_deleted")
      .eq("user_id", authorId)
      .maybeSingle();

    if (prefs && (!prefs.email_enabled || !prefs.email_on_post_deleted)) return;

    const email = await getUserEmail(authorId);
    if (!email) return;

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `⚠️ Tu post ha sido eliminado`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#e85d04">Tu post ha sido eliminado</h2>
          <p>El administrador ha eliminado tu post <strong>"${postTitle}"</strong> por incumplir las normas de la comunidad.</p>
          <p style="color:#666;font-size:14px">Si crees que es un error, puedes contactar con el equipo de moderación.</p>
          ${footer()}
        </div>
      `,
    });
  } catch (err) {
    console.error("notifyPostDeleted error", err);
  }
}

export async function notifyAccountStatus({
  userId,
  suspended,
}: {
  userId: string;
  suspended: boolean;
}) {
  const resend = getResend();
  if (!resend) return;

  try {
    const admin = createAdminClient();

    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("email_enabled, email_on_account_status")
      .eq("user_id", userId)
      .maybeSingle();

    // Para notificaciones de cuenta, solo respetamos el toggle específico (no el master)
    if (prefs && !prefs.email_on_account_status) return;

    const email = await getUserEmail(userId);
    if (!email) return;

    if (suspended) {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `🚫 Tu cuenta en ForoPrime ha sido suspendida`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">Cuenta suspendida</h2>
            <p>Tu cuenta en ForoPrime ha sido <strong>suspendida temporalmente</strong> por el equipo de moderación.</p>
            <p style="color:#666;font-size:14px">Durante la suspensión no podrás publicar ni comentar. Puedes seguir leyendo el contenido de la comunidad.</p>
            <p style="color:#666;font-size:14px">Si crees que es un error, contacta con el equipo de moderación.</p>
            ${footer()}
          </div>
        `,
      });
    } else {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `✅ Tu cuenta en ForoPrime ha sido reactivada`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#16a34a">Cuenta reactivada</h2>
            <p>Tu cuenta en ForoPrime ha sido <strong>reactivada</strong>. Ya puedes publicar y comentar de nuevo.</p>
            <p style="color:#666;font-size:14px">Recuerda respetar las normas de la comunidad.</p>
            ${footer()}
          </div>
        `,
      });
    }
  } catch (err) {
    console.error("notifyAccountStatus error", err);
  }
}
