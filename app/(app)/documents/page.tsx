import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/features/documents/components/UploadDropzone";
import { createClient } from "@/lib/supabase/server";
import type { DocumentStatus } from "@/lib/types/database.types";

export const metadata: Metadata = { title: "Papers" };

const STATUS_VARIANT: Record<DocumentStatus, "default" | "secondary" | "destructive"> = {
  ready: "default",
  processing: "secondary",
  failed: "destructive",
};

export default async function DocumentsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = user?.is_anonymous ?? false;

  // Guests browse the public demo papers; everyone else sees only their own,
  // so a shared demo document never appears inside a personal library.
  const query = supabase
    .from("documents")
    .select("id, title, status, page_count, created_at, error_message")
    .order("created_at", { ascending: false });

  const { data: documents } = await (isGuest
    ? query.eq("is_demo", true)
    : query.eq("user_id", user?.id ?? ""));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Papers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isGuest
            ? "You're in the demo workspace. Open a paper and ask it anything."
            : "Upload a PDF, then ask questions and get answers with page-level citations."}
        </p>
      </header>

      {isGuest ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
          <p className="text-sm">Guest session. Uploads are disabled.</p>
          <Button asChild size="sm">
            <Link href="/signup">Sign up to add your own papers</Link>
          </Button>
        </div>
      ) : (
        <UploadDropzone />
      )}

      <section className="mt-8">
        {!documents || documents.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Your library is empty. Upload a paper to get started.
          </p>
        ) : (
          <ul className="grid gap-3">
            {documents.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/documents/${doc.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border/70 bg-card/60 p-4 transition-colors hover:border-primary/50"
                >
                  <FileText className="size-5 shrink-0 text-primary" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{doc.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doc.status === "failed" && doc.error_message
                        ? doc.error_message
                        : doc.page_count
                          ? `${doc.page_count} pages`
                          : "Processing…"}
                    </p>
                  </div>

                  <Badge variant={STATUS_VARIANT[doc.status]} className="shrink-0 capitalize">
                    {doc.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
