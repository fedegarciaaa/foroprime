import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { VoteButtons } from "@/components/post/vote-buttons";
import { formatRelativeEs } from "@/lib/utils";

export type PostCardData = {
  id: number;
  title: string;
  slug: string;
  body_md: string;
  score: number;
  comment_count: number;
  created_at: string;
  subforum_slug: string;
  subforum_name: string;
  author_username: string;
  author_id: string;
  my_vote?: -1 | 0 | 1;
  image_urls?: string[];
};

export function PostCard({ post, authed, currentUserId }: { post: PostCardData; authed: boolean; currentUserId?: string | null }) {
  const isOwn = !!currentUserId && currentUserId === post.author_id;
  const preview = post.body_md.length > 240 ? `${post.body_md.slice(0, 240)}…` : post.body_md;

  const hasThumbnail = post.image_urls && post.image_urls.length > 0;

  return (
    <Card className="flex gap-3 p-3 transition-colors hover:border-foreground/20">
      <div className="flex shrink-0 items-start pt-0.5">
        <VoteButtons
          target="post"
          targetId={post.id}
          initialScore={post.score}
          initialMyVote={(post.my_vote ?? 0) as -1 | 0 | 1}
          authed={authed}
          isOwn={isOwn}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <Link
            href={`/s/${post.subforum_slug}`}
            className="font-medium text-foreground hover:underline"
          >
            s/{post.subforum_slug}
          </Link>
          <span>·</span>
          <span>
            por{" "}
            <Link href={`/u/${post.author_username}`} className="hover:underline">
              @{post.author_username}
            </Link>
          </span>
          <span>·</span>
          <span>{formatRelativeEs(post.created_at)}</span>
        </div>
        <h3 className="mb-1 text-base font-semibold leading-snug">
          <Link href={`/p/${post.id}/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        {preview ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{preview}</p>
        ) : null}
        <div className="mt-2 text-xs text-muted-foreground">
          <Link
            href={`/p/${post.id}/${post.slug}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {post.comment_count} {post.comment_count === 1 ? "comentario" : "comentarios"}
          </Link>
        </div>
      </div>
      {hasThumbnail && (
        <Link href={`/p/${post.id}/${post.slug}`} className="shrink-0 self-center">
          <div className="h-20 w-20 overflow-hidden rounded-md">
            <img
              src={post.image_urls![0]}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </Link>
      )}
    </Card>
  );
}
