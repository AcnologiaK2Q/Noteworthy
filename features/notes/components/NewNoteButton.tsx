"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createNote } from "@/features/notes/actions";

export function NewNoteButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function create() {
    setPending(true);
    const { id, error } = await createNote();
    setPending(false);

    if (error || !id) {
      toast.error(error ?? "Could not create the note.");
      return;
    }

    router.push(`/notes/${id}`);
  }

  return (
    <Button size="sm" disabled={pending} onClick={() => void create()}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      New note
    </Button>
  );
}
