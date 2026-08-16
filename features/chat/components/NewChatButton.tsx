"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createConversation } from "@/features/chat/actions";

export function NewChatButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    const { id, error } = await createConversation();
    setPending(false);

    if (error || !id) {
      toast.error(error ?? "Could not start a chat.");
      return;
    }

    router.push(`/chat/${id}`);
  }

  return (
    <Button size="sm" disabled={pending} onClick={() => void start()}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      New chat
    </Button>
  );
}
