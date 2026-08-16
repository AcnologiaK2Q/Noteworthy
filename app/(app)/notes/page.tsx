import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen } from "lucide-react";

import { NewNoteButton } from "@/features/notes/components/NewNoteButton";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage() {
  const supabase = createClient();

  const { data: notes } = await supabase
    .from("notes")
    .select("id, title, content_markdown, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Markdown notes, including answers you saved from papers.
          </p>
        </div>
        <NewNoteButton />
      </header>

      {!notes || notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <NotebookPen className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No notes yet.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                href={`/notes/${note.id}`}
                className="block rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-primary/50"
              >
                <p className="truncate text-sm font-medium">{note.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {note.content_markdown.replace(/[#*_`>-]/g, "").trim() || "Empty note"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
