"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { deleteNote, updateNote } from "@/features/notes/actions";

const AUTOSAVE_DELAY_MS = 900;

interface NoteEditorProps {
  id: string;
  initialTitle: string;
  initialContent: string;
}

export function NoteEditor({ id, initialTitle, initialContent }: NoteEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaving(true);
    const timer = setTimeout(async () => {
      const { error } = await updateNote(id, { title, content });
      setSaving(false);

      if (error) toast.error(error);
      else setSavedAt(Date.now());
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [id, title, content]);

  async function remove() {
    const { error } = await deleteNote(id);
    if (error) {
      toast.error(error);
      return;
    }
    router.push("/notes");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled note"
          className="h-9 border-0 bg-transparent px-0 text-base font-medium shadow-none focus-visible:ring-0"
        />

        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Saving
            </>
          ) : savedAt ? (
            <>
              <Check className="size-3" />
              Saved
            </>
          ) : null}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => void remove()}
          aria-label="Delete note"
        >
          <Trash2 className="size-4" />
        </Button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write in markdown…"
          className="min-h-0 resize-none rounded-none border-0 border-b p-6 text-sm leading-relaxed shadow-none focus-visible:ring-0 lg:border-b-0 lg:border-r"
        />

        <div className="min-h-0 overflow-y-auto p-6">
          {content.trim() ? (
            <Markdown>{content}</Markdown>
          ) : (
            <p className="text-sm text-muted-foreground">Preview appears here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
