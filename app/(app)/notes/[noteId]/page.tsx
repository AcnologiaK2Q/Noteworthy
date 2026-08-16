import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GenerateDeckButton } from "@/features/flashcards/components/GenerateDeckButton";
import { NoteEditor } from "@/features/notes/components/NoteEditor";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: { noteId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("notes")
    .select("title")
    .eq("id", params.noteId)
    .maybeSingle();

  return { title: data?.title ?? "Note" };
}

export default async function NotePage({ params }: PageProps) {
  const supabase = createClient();

  const { data: note } = await supabase
    .from("notes")
    .select("id, title, content_markdown")
    .eq("id", params.noteId)
    .maybeSingle();

  if (!note) notFound();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 md:px-6">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/notes" aria-label="Back to notes">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <GenerateDeckButton
          sourceType="note"
          sourceId={note.id}
          label={
            <>
              <Layers className="size-3.5" />
              Flashcards
            </>
          }
        />
      </div>

      <NoteEditor
        id={note.id}
        initialTitle={note.title}
        initialContent={note.content_markdown}
      />
    </div>
  );
}
