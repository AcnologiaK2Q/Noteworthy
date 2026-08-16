"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { reviewCard } from "@/features/flashcards/actions";
import type { ReviewGrade } from "@/features/flashcards/sm2";
import { cn } from "@/lib/utils";

export interface StudyCard {
  id: string;
  question: string;
  answer: string;
}

const GRADES: { grade: ReviewGrade; label: string; className: string }[] = [
  { grade: "again", label: "Again", className: "hover:border-destructive/60 hover:text-destructive" },
  { grade: "hard", label: "Hard", className: "hover:border-warning/60 hover:text-warning" },
  { grade: "good", label: "Good", className: "hover:border-secondary/60 hover:text-secondary" },
  { grade: "easy", label: "Easy", className: "hover:border-success/60 hover:text-success" },
];

export function StudyView({ cards }: { cards: StudyCard[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);

  const card = cards[index];
  const done = index >= cards.length;

  async function grade(value: ReviewGrade) {
    if (pending || !card) return;

    setPending(true);
    const { error } = await reviewCard(card.id, value);
    setPending(false);

    if (error) {
      toast.error(error);
      return;
    }

    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (done) {
    return (
      <div className="grid place-items-center py-20 text-center">
        <p className="text-lg font-medium">Session complete</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You reviewed {cards.length} {cards.length === 1 ? "card" : "cards"}.
        </p>
        <Button className="mt-6" onClick={() => router.push("/flashcards")}>
          Back to decks
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <p className="mb-4 text-center font-mono text-xs text-muted-foreground">
        {index + 1} / {cards.length}
      </p>

      <button
        onClick={() => setRevealed(true)}
        disabled={revealed}
        className={cn(
          "grid min-h-64 w-full place-items-center rounded-2xl border border-border/70 bg-card/60 p-8 text-center transition-colors",
          !revealed && "cursor-pointer hover:border-primary/50",
        )}
      >
        <div>
          <p className="text-base font-medium">{card.question}</p>

          {revealed ? (
            <p className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">
              {card.answer}
            </p>
          ) : (
            <p className="mt-6 text-xs text-muted-foreground">Click to reveal</p>
          )}
        </div>
      </button>

      {revealed && (
        <div className="mt-6 grid grid-cols-4 gap-2">
          {GRADES.map(({ grade: g, label, className }) => (
            <Button
              key={g}
              variant="outline"
              disabled={pending}
              onClick={() => void grade(g)}
              className={cn("transition-colors", className)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
