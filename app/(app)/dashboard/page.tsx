import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Layers, MessageSquare, NotebookPen, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BentoCard } from "@/features/dashboard/components/BentoCard";
import { getUserStats } from "@/features/dashboard/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = createClient();

  const [
    {
      data: { user },
    },
    stats,
  ] = await Promise.all([supabase.auth.getUser(), getUserStats(supabase)]);

  // Scoped to the signer's own uploads. Demo papers are readable by everyone,
  // so without this the list would show a paper the counts do not include.
  const { data: recentDocs } = await supabase
    .from("documents")
    .select("id, title, status, page_count")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(4);

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const hasPapers = (recentDocs?.length ?? 0) > 0;

  // Only measured values appear. A metric with no data behind it is omitted
  // rather than shown as a zero, so the line never overstates the work done.
  const measured = [
    stats.documentsReady > 0 && `${stats.documentsReady} papers analyzed`,
    stats.questionsAnswered > 0 && `${stats.questionsAnswered} questions answered`,
    stats.retrievalSuccessRate !== null && `${stats.retrievalSuccessRate}% grounded`,
    stats.avgResponseMs !== null && `${(stats.avgResponseMs / 1000).toFixed(1)}s average`,
  ].filter(Boolean) as string[];

  return (
    <div className="bg-aurora min-h-full">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            {firstName ? `Welcome back, ${firstName}` : "Your workspace"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {measured.length > 0
              ? measured.join("  ·  ")
              : "Upload a paper, ask a question, keep the evidence."}
          </p>
        </header>

        <section className="grid auto-rows-[11rem] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BentoCard
            title="Papers"
            href="/documents"
            icon={<FileText className="size-4" />}
            className="sm:col-span-2 lg:row-span-2"
            meta={hasPapers ? `${stats.documentsReady} indexed` : undefined}
          >
            {hasPapers ? (
              <ul className="grid gap-1.5">
                {recentDocs!.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-1.5 last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{doc.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {doc.status === "ready"
                        ? doc.page_count
                          ? `${doc.page_count} pages`
                          : "Ready"
                        : doc.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex h-full flex-col items-start justify-center gap-3">
                <p className="text-lg font-medium">Drop in a paper</p>
                <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                  Ask it anything and every answer comes back with the page it came from.
                </p>
                <Button asChild size="sm" className="mt-1">
                  <Link href="/documents">
                    <Upload className="size-3.5" />
                    Upload a PDF
                  </Link>
                </Button>
              </div>
            )}
          </BentoCard>

          <BentoCard
            title="Chat"
            description="Open-ended research questions, no document attached."
            href="/chat"
            icon={<MessageSquare className="size-4" />}
            className="sm:col-span-2"
            meta={
              stats.questionsAnswered > 0 ? `${stats.questionsAnswered} answered` : "nothing yet"
            }
          />

          <BentoCard
            title="Notes"
            description="Markdown, and answers you kept."
            href="/notes"
            icon={<NotebookPen className="size-4" />}
            meta={stats.notesCount > 0 ? `${stats.notesCount} saved` : "nothing yet"}
          />

          <BentoCard
            title="Flashcards"
            description="Written from your papers and notes."
            href="/flashcards"
            icon={<Layers className="size-4" />}
            meta={
              stats.flashcardsCount === 0
                ? "nothing yet"
                : stats.cardsDue > 0
                  ? `${stats.cardsDue} due now`
                  : `${stats.flashcardsCount} scheduled`
            }
          />
        </section>
      </div>
    </div>
  );
}
