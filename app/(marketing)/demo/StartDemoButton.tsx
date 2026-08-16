"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function StartDemoButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInAnonymously();

    if (error) {
      setPending(false);
      toast.error(
        error.message.includes("disabled")
          ? "Guest access is turned off. Enable anonymous sign-ins in Supabase."
          : error.message,
      );
      return;
    }

    router.push(`/documents/${documentId}`);
    router.refresh();
  }

  return (
    <Button size="lg" className="mt-6 h-12 w-full" disabled={pending} onClick={() => void start()}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Open demo workspace
      {!pending && <ArrowRight className="size-4" />}
    </Button>
  );
}
