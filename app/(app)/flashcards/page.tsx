import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const supabase = createClient();

  const { data: decks } = await supabase
    .from("flashcard_decks")
    .select("id, title, source_type, created_at, flashcards(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Flashcards</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Decks generated from your papers and notes, scheduled with spaced repetition.
        </p>
      </header>

      {!decks || decks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Layers className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No decks yet. Generate one from a paper or a note.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((deck) => {
            const count = (deck.flashcards as unknown as { count: number }[])?.[0]?.count ?? 0;

            return (
              <li key={deck.id}>
                <Link
                  href={`/flashcards/${deck.id}`}
                  className="flex h-full flex-col rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-primary/50"
                >
                  <p className="truncate text-sm font-medium">{deck.title}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    from {deck.source_type}
                  </p>
                  <p className="mt-auto pt-4 text-2xl font-semibold">{count}</p>
                  <p className="text-xs text-muted-foreground">cards</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
