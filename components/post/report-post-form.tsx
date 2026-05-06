"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { reportPost } from "@/lib/actions/reports";
import { REPORT_REASONS } from "@/lib/reports-config";

export function ReportPostForm({ postId }: { postId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("postId", String(postId));
      fd.set("reason", reason);
      fd.set("comment", comment);

      const result = await reportPost(fd);
      if (result.ok) {
        toast({ title: "Denuncia enviada", description: "Revisaremos tu denuncia lo antes posible." });
        setOpen(false);
        setReason("");
        setComment("");
      } else {
        toast({ title: "No se pudo enviar", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Flag className="h-3.5 w-3.5" />
        Denunciar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Denunciar este post</DialogTitle>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo de la denuncia</Label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-primary"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="report-comment">
                Comentario adicional <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="report-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Proporciona más contexto si es necesario…"
                rows={3}
                maxLength={500}
                className="resize-none text-sm"
              />
            </div>

            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" size="sm" disabled={!reason || pending} variant="destructive">
                {pending ? "Enviando…" : "Enviar denuncia"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
