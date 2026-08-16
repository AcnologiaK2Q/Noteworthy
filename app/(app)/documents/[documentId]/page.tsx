import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GenerateDeckButton } from "@/features/flashcards/components/GenerateDeckButton";
import { DocumentWorkspace } from "@/features/documents/components/DocumentWorkspace";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: { documentId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from("documents")
    .select("title")
    .eq("id", params.documentId)
    .maybeSingle();

  return { title: data?.title ?? "Paper" };
}

export default async function DocumentPage({ params }: PageProps) {
  const supabase = createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, status, page_count, error_message")
    .eq("id", params.documentId)
    .maybeSingle();

  if (!doc) notFound();

  const { data: chunks } = await supabase
    .from("document_chunks")
    .select("id, page_number, content")
    .eq("document_id", doc.id)
    .order("chunk_index", { ascending: true });

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex items-center gap-4 border-b border-border px-4 py-3 md:px-6">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/documents" aria-label="Back to papers">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium">{doc.title}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {doc.status === "failed" && doc.error_message
              ? doc.error_message
              : doc.page_count
                ? `${doc.page_count} pages`
                : "Processing…"}
          </p>
        </div>

        {doc.status === "ready" ? (
          <GenerateDeckButton
            sourceType="document"
            sourceId={doc.id}
            label={
              <>
                <Layers className="size-3.5" />
                Flashcards
              </>
            }
          />
        ) : (
          <Badge variant={doc.status === "failed" ? "destructive" : "secondary"} className="capitalize">
            {doc.status}
          </Badge>
        )}
      </header>

      <DocumentWorkspace
        documentId={doc.id}
        documentTitle={doc.title}
        ready={doc.status === "ready"}
        chunks={(chunks ?? []).map((c) => ({
          id: c.id,
          pageNumber: c.page_number,
          content: c.content,
        }))}
      />
    </div>
  );
}
