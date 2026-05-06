"use client";

import { useOptimistic, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { votePost, voteComment } from "@/lib/actions/votes";

type Props = {
  target: "post" | "comment";
  targetId: number;
  initialScore: number;
  initialMyVote: -1 | 0 | 1;
  authed: boolean;
  isOwn?: boolean;
  layout?: "vertical" | "horizontal";
};

type VoteState = { score: number; my: -1 | 0 | 1 };

export function VoteButtons({ target, targetId, initialScore, initialMyVote, authed, isOwn = false, layout = "vertical" }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic<VoteState, -1 | 1>(
    { score: initialScore, my: initialMyVote },
    (current, next) => {
      const newMy = current.my === next ? 0 : next;
      const delta = newMy - current.my;
      return { score: current.score + delta, my: newMy };
    },
  );

  function vote(value: -1 | 1) {
    if (isOwn) return;
    if (!authed) {
      toast({
        title: "Inicia sesión para votar",
        description: "Crear cuenta es gratis y solo te toma un minuto.",
      });
      router.push("/login");
      return;
    }
    startTransition(async () => {
      setOptimistic(value);
      const action = target === "post" ? votePost : voteComment;
      const desired = state.my === value ? 0 : value;
      const result = await action(targetId, desired as -1 | 0 | 1);
      if (!result.ok) {
        toast({ title: "No se pudo votar", description: result.error, variant: "destructive" });
        router.refresh();
      }
    });
  }

  const isUp = state.my === 1;
  const isDown = state.my === -1;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        layout === "vertical" ? "flex-col" : "flex-row",
      )}
    >
      <button
        type="button"
        onClick={() => vote(1)}
        aria-label="Votar arriba"
        aria-pressed={isUp}
        disabled={isOwn}
        title={isOwn ? "No puedes votar tu propio post" : undefined}
        className={cn(
          "rounded p-1 transition-colors",
          isOwn ? "cursor-not-allowed opacity-40" : "hover:bg-accent",
          isUp ? "text-[var(--color-upvote)]" : "text-muted-foreground",
        )}
      >
        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <span
        className={cn(
          "min-w-[1.5rem] text-center text-xs font-semibold tabular-nums",
          isUp && "text-[var(--color-upvote)]",
          isDown && "text-[var(--color-downvote)]",
        )}
      >
        {state.score}
      </span>
      <button
        type="button"
        onClick={() => vote(-1)}
        aria-label="Votar abajo"
        aria-pressed={isDown}
        disabled={isOwn}
        title={isOwn ? "No puedes votar tu propio post" : undefined}
        className={cn(
          "rounded p-1 transition-colors",
          isOwn ? "cursor-not-allowed opacity-40" : "hover:bg-accent",
          isDown ? "text-[var(--color-downvote)]" : "text-muted-foreground",
        )}
      >
        <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}
