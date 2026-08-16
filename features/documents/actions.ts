"use server";

import { revalidatePath } from "next/cache";

import { logEvent } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

export interface CreateDocumentResult {
  documentId: string;
  storagePath: string;
}

/**
 * Reserves the document row before upload so the storage key can be namespaced
 * by document id, and a failed upload leaves a visible `processing` row rather
 * than an orphaned file.
 */
export async function createDocumentRecord(
  title: string,
  fileName: string,
  fileSizeBytes: number,
): Promise<{ data?: CreateDocumentResult; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to upload." };

  const documentId = crypto.randomUUID();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${user.id}/${documentId}/${safeName}`;

  const { error } = await supabase.from("documents").insert({
    id: documentId,
    user_id: user.id,
    title,
    storage_path: storagePath,
    file_size_bytes: fileSizeBytes,
    status: "processing",
  });

  if (error) return { error: error.message };

  await logEvent({
    supabase,
    userId: user.id,
    type: "pdf_upload",
    metadata: { documentId, fileSizeBytes },
  });

  return { data: { documentId, storagePath } };
}

export async function deleteDocument(documentId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, user_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc || doc.user_id !== user.id) return { error: "Document not found." };

  await supabase.storage.from("documents").remove([doc.storage_path]);

  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) return { error: error.message };

  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return {};
}
