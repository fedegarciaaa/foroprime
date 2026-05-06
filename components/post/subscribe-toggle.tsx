"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { togglePostSubscription } from "@/lib/actions/notifications";

export function SubscribeToggle({
  postId,
  initialSubscribed,
}: {
  postId: number;
  initialSubscribed: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await togglePostSubscription(postId);
      if (result.ok) {
        setSubscribed(result.data.subscribed);
        toast({
          title: result.data.subscribed
            ? "Suscrito al hilo"
            : "Suscripción cancelada",
          description: result.data.subscribed
            ? "Recibirás un email cuando haya nuevos comentarios"
            : "Ya no recibirás notificaciones de este post",
        });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 text-xs text-muted-foreground"
      onClick={handleToggle}
      disabled={pending}
    >
      {subscribed ? (
        <>
          <BellOff className="h-3.5 w-3.5" />
          Desuscribirse
        </>
      ) : (
        <>
          <Bell className="h-3.5 w-3.5" />
          Seguir hilo
        </>
      )}
    </Button>
  );
}
