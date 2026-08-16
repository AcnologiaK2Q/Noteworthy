import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, Layers, MessageSquare, NotebookPen } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  const { data: papers } = await supabase
    .from("documents")
    .select("id, title, status, page_count")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(5);

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const hasPapers = (papers?.length ?? 0) > 0;

  // Only measured values appear. A metric with nothing behind it is omitted
  // rather than shown as a zero, so the line never overstates the work done.
  const measured = [
    stats.documentsReady > 0 && [String(stats.documentsReady), "papers"],
    stats.questionsAnswered > 0 && [String(stats.questionsAnswered), "questions"],
    stats.retrievalSuccessRate !== null && [`${stats.retrievalSuccessRate}%`, "grounded"],
    stats.avgResponseMs !== null && [`${(stats.avgResponseMs / 1000).toFixed(1)}s`, "average"],
  ].filter(Boolean) as [string, string][];

  const rail = [
    {
      href: "/chat",
      label: "Chat",
      icon: MessageSquare,
      note: stats.questionsAnswered > 0 ? `${stats.questionsAnswered} answered` : "Ask anything",
    },
    {
      href: "/notes",
      label: "Notes",
      icon: NotebookPen,
      note: stats.notesCount > 0 ? `${stats.notesCount} saved` : "Nothing saved yet",
    },
    {
      href: "/flashcards",
      label: "Flashcards",
      icon: Layers,
      note:
        stats.flashcardsCount === 0
          ? "No cards yet"
          : stats.cardsDue > 0
            ? `${stats.cardsDue} due now`
            : `${stats.flashcardsCount} scheduled`,
    },
  ];

  return (
    <div className="bg-aurora min-h-full">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-16">
        <header className="mb-10 md:mb-14">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            {firstName ? (
              <>
                Welcome back,{" "}
                <span className="marker marker-draw">{firstName}</span>
              </>
            ) : (
              <>
                Your <span className="marker marker-draw">workspace</span>
              </>
            )}
          </h1>

          {measured.length > 0 && (
            <dl className="mt-7 flex flex-wrap items-baseline gap-x-8 gap-y-3">
              {measured.map(([value, label]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
                  <span className="text-sm text-muted-foreground">{label}</span>
                </div>
              ))}
            </dl>
          )}
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.9fr_1fr]">
          {/* The work surface, ruled like a page. */}
          <section className="ruled relative overflow-hidden rounded-2xl border border-border/60 bg-card/40">
            <div className="relative flex min-h-[22rem] flex-col p-6 md:p-8">
              <div className="flex items-center gap-2.5 text-sm font-medium">
                <FileText className="size-4 text-primary" />
                Papers
              </div>

              {hasPapers ? (
                <>
                  <ul className="mt-6 flex-1">
                    {papers!.map((doc) => (
                      <li key={doc.id}>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="group flex items-baseline justify-between gap-4 border-b border-border/40 py-3 transition-colors hover:border-primary/40"
                        >
                          <span className="min-w-0 flex-1 truncate text-[0.95rem] group-hover:text-secondary">
                            {doc.title}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {doc.status === "ready"
                              ? doc.page_count
                                ? `${doc.page_count} pages`
                                : "Ready"
                              : doc.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <Button asChild variant="ghost" size="sm" className="mt-6 self-start px-0">
                    <Link href="/documents">
                      Open library
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="flex flex-1 flex-col justify-center">
                  <p className="max-w-md text-2xl font-medium leading-snug tracking-tight">
                    Drop in a paper and ask it{" "}
                    <span className="marker">what the method actually was</span>.
                  </p>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Answers come back with the page they came from. Click a citation to see the
                    passage it rests on.
                  </p>
                  <Button asChild className="mt-7 self-start">
                    <Link href="/documents">
                      Upload a PDF
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* The margin rail. */}
          <aside className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {rail.map(({ href, label, icon: Icon, note }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/40 hover:bg-card/70 lg:min-h-[6.6rem]"
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 text-primary" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground group-hover:text-secondary">
                  {note}
                </p>
              </Link>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
}
