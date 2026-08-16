"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { generateDeck } from "@/features/flashcards/actions";

interface GenerateDeckButtonProps {
  sourceType: "note" | "document";
  sourceId: string;
  label: React.ReactNode;
  cardCount?: number;
}

export function GenerateDeckButton({
  sourceType,
  sourceId,
  label,
  cardCount = 10,
}: GenerateDeckButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    toast.info("Writing flashcards…");

    const { deckId, error } = await generateDeck(sourceType, sourceId, cardCount);

    setPending(false);

    if (error || !deckId) {
      toast.error(error ?? "Could not generate a deck.");
      return;
    }

    toast.success("Deck ready.");
    router.push(`/flashcards/${deckId}`);
  }

  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => void run()}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : label}
    </Button>
  );
}
