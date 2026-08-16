import type { Metadata } from "next";

import { getUserStats } from "@/features/dashboard/stats";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stats = await getUserStats(supabase);

  const rows: { label: string; value: string }[] = [
    { label: "Email", value: user?.email ?? "N/A" },
    { label: "Papers indexed", value: String(stats.documentsReady) },
    { label: "Questions answered", value: String(stats.questionsAnswered) },
    { label: "Notes", value: String(stats.notesCount) },
    { label: "Flashcards", value: String(stats.flashcardsCount) },
    {
      label: "Avg. paper processing",
      value: stats.avgProcessingMs === null ? "N/A" : `${(stats.avgProcessingMs / 1000).toFixed(1)}s`,
    },
    {
      label: "Avg. answer latency",
      value: stats.avgResponseMs === null ? "N/A" : `${(stats.avgResponseMs / 1000).toFixed(1)}s`,
    },
    {
      label: "Retrieval success rate",
      value: stats.retrievalSuccessRate === null ? "N/A" : `${stats.retrievalSuccessRate}%`,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account, and what this workspace has measured so far.
        </p>
      </header>

      <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border/70 bg-card/60">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="truncate font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
