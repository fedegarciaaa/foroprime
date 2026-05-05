"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VoteButtons } from "@/components/post/vote-buttons";
import { CommentForm } from "@/components/comment/comment-form";
import { formatRelativeEs, cn } from "@/lib/utils";

export type CommentNode = {
  id: number;
  parent_id: number | null;
  author_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  body_html: string;
  body_md: string;
  depth: number;
  score: number;
  created_at: string;
  deleted_at: string | null;
  my_vote: -1 | 0 | 1;
  children: CommentNode[];
};

export function CommentTree({
  nodes,
  postId,
  authed,
}: {
  nodes: CommentNode[];
  postId: number;
  authed: boolean;
}) {
  if (nodes.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Aún no hay comentarios. Sé el primero.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {nodes.map((n) => (
        <CommentItem key={n.id} node={n} postId={postId} authed={authed} />
      ))}
    </ul>
  );
}

function CommentItem({ node, postId, authed }: { node: CommentNode; postId: number; authed: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const isDeleted = !!node.deleted_at;
  const initial = (node.display_name ?? node.username).charAt(0).toUpperCase();

  return (
    <li className={cn("group", node.depth > 0 && "border-l border-border pl-3 sm:pl-4")}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expandir hilo" : "Contraer hilo"}
          className="mt-1 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5">
              {node.avatar_url ? <AvatarImage src={node.avatar_url} alt="" /> : null}
              <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
            </Avatar>
            <Link href={`/u/${node.username}`} className="font-medium text-foreground hover:underline">
              @{node.username}
            </Link>
            <span>·</span>
            <span>{formatRelativeEs(node.created_at)}</span>
            <span>·</span>
            <span className={cn("tabular-nums", node.score > 0 && "text-[var(--color-upvote)]", node.score < 0 && "text-[var(--color-downvote)]")}>
              {node.score} {Math.abs(node.score) === 1 ? "pt" : "pts"}
            </span>
          </div>

          {!collapsed ? (
            <>
              {isDeleted ? (
                <p className="mt-1 text-sm italic text-muted-foreground">[comentario eliminado]</p>
              ) : (
                <div
                  className="prose-fp mt-1 text-sm"
                  dangerouslySetInnerHTML={{ __html: node.body_html }}
                />
              )}
              <div className="mt-1 flex items-center gap-1">
                <VoteButtons
                  target="comment"
                  targetId={node.id}
                  initialScore={node.score}
                  initialMyVote={node.my_vote}
                  authed={authed}
                  layout="horizontal"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setReplying((r) => !r)}
                >
                  <Reply className="h-3 w-3" /> Responder
                </Button>
              </div>
              {replying ? (
                <div className="mt-2">
                  <CommentForm
                    postId={postId}
                    parentId={node.id}
                    authed={authed}
                    onDone={() => setReplying(false)}
                    autoFocus
                    compact
                  />
                </div>
              ) : null}
              {node.children.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {node.children.map((c) => (
                    <CommentItem key={c.id} node={c} postId={postId} authed={authed} />
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-xs italic text-muted-foreground">
              Hilo contraído ({1 + countDescendants(node)} {countDescendants(node) === 0 ? "comentario" : "comentarios"})
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function countDescendants(n: CommentNode): number {
  return n.children.reduce((acc, c) => acc + 1 + countDescendants(c), 0);
}
