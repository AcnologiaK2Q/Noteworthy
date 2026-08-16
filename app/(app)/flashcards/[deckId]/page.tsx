import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StudyView } from "@/features/flashcards/components/StudyView";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: { deckId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("flashcard_decks")
    .select("title")
    .eq("id", params.deckId)
    .maybeSingle();

  return { title: data?.title ?? "Deck" };
}

export default async function DeckPage({ params }: PageProps) {
  const supabase = createClient();

  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("id, title")
    .eq("id", params.deckId)
    .maybeSingle();

  if (!deck) notFound();

  const { data: due } = await supabase
    .from("flashcards")
    .select("id, question, answer")
    .eq("deck_id", deck.id)
    .lte("due_at", new Date().toISOString())
    .order("due_at", { ascending: true });

  const { count: total } = await supabase
    .from("flashcards")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deck.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <header className="mb-6 flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/flashcards" aria-label="Back to decks">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{deck.title}</h1>
          <p className="text-xs text-muted-foreground">
            {due?.length ?? 0} due of {total ?? 0} cards
          </p>
        </div>
      </header>

      {!due || due.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium">Nothing due right now</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cards return on their spaced-repetition schedule.
          </p>
        </div>
      ) : (
        <StudyView cards={due} />
      )}
    </div>
  );
}
