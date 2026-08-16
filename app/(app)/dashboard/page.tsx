import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Layers, MessageSquare, NotebookPen, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BentoCard, StatTile } from "@/features/dashboard/components/BentoCard";
import { getUserStats } from "@/features/dashboard/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: user }, stats] = await Promise.all([
    supabase.auth.getUser().then((r) => ({ data: r.data.user })),
    getUserStats(supabase),
  ]);

  const { data: recentDocs } = await supabase
    .from("documents")
    .select("id, title, status")
    .order("created_at", { ascending: false })
    .limit(3);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0];

  return (
    <div className="bg-aurora min-h-full px-4 py-8 md:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Welcome back, ${firstName}` : "Your workspace"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a paper, ask a question, keep the evidence.
        </p>
      </header>

      <section className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Papers analyzed" value={String(stats.documentsReady)} />
        <StatTile label="Questions answered" value={String(stats.questionsAnswered)} />
        <StatTile
          label="Retrieval success"
          value={stats.retrievalSuccessRate === null ? "—" : `${stats.retrievalSuccessRate}%`}
          hint={stats.retrievalSuccessRate === null ? "No queries yet" : "Answers with strong evidence"}
        />
        <StatTile
          label="Avg. response"
          value={stats.avgResponseMs === null ? "—" : `${(stats.avgResponseMs / 1000).toFixed(1)}s`}
          hint={stats.avgResponseMs === null ? "No queries yet" : undefined}
        />
      </section>

      <section className="grid auto-rows-[minmax(11rem,auto)] gap-4 lg:grid-cols-4">
        <BentoCard
          title="Papers"
          description="Upload a PDF and chat with its contents."
          href="/documents"
          icon={<FileText className="size-4" />}
          className="lg:col-span-2 lg:row-span-2"
        >
          {recentDocs && recentDocs.length > 0 ? (
            <ul className="grid gap-2">
              {recentDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-background/50 px-3 py-2"
                >
                  <span className="truncate text-sm">{doc.title}</span>
                  <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {doc.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Upload className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No papers yet</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/documents">Upload your first paper</Link>
              </Button>
            </div>
          )}
        </BentoCard>

        <BentoCard
          title="Chat"
          description="Ask general research questions."
          href="/chat"
          icon={<MessageSquare className="size-4" />}
          className="lg:col-span-2"
        />

        <BentoCard
          title="Notes"
          description="Markdown notes, saved from answers."
          href="/notes"
          icon={<NotebookPen className="size-4" />}
        >
          <p className="font-mono text-2xl">{stats.notesCount}</p>
        </BentoCard>

        <BentoCard
          title="Flashcards"
          description="Generated from your papers and notes."
          href="/flashcards"
          icon={<Layers className="size-4" />}
        >
          <p className="font-mono text-2xl">{stats.cardsDue}</p>
          <p className="text-xs text-muted-foreground">
            {stats.flashcardsCount === 0 ? "No cards yet" : "due for review"}
          </p>
        </BentoCard>
      </section>
    </div>
  );
}
