"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Citation } from "@/lib/types/database.types";

export async function createNote(
  input: { title?: string; content?: string; documentId?: string } = {},
): Promise<{ id?: string; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: input.title ?? "Untitled note",
      content_markdown: input.content ?? "",
      document_id: input.documentId ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/notes");
  revalidatePath("/dashboard");
  return { id: data.id };
}

export async function updateNote(
  id: string,
  input: { title?: string; content?: string },
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("notes")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content_markdown: input.content }),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/notes");
  return {};
}

export async function deleteNote(id: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("notes").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/notes");
  revalidatePath("/dashboard");
  return {};
}

/** Turns one document Q&A exchange into a note, citations included. */
export async function saveAnswerAsNote(input: {
  documentId: string;
  documentTitle: string;
  question: string;
  answer: string;
  citations: Citation[];
}): Promise<{ id?: string; error?: string }> {
  const sources = input.citations.length
    ? `\n\n---\n\n**Sources** (${input.documentTitle})\n\n${input.citations
        .map((c) => `- ${c.page ? `p. ${c.page}` : "page unknown"}: ${c.snippet.trim()}…`)
        .join("\n")}`
    : "";

  return createNote({
    title: input.question.slice(0, 80),
    content: `# ${input.question}\n\n${input.answer}${sources}`,
    documentId: input.documentId,
  });
}
