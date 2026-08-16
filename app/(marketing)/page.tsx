import Link from "next/link";
import { ArrowRight, BookmarkCheck, FileSearch, Quote } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    icon: FileSearch,
    title: "Upload",
    body: "Drop in a paper. Noteworthy extracts the text, splits it into passages, and indexes them for semantic search.",
  },
  {
    icon: Quote,
    title: "Ask",
    body: "Ask in plain language. Answers come back grounded in the paper, with page-level citations you can click.",
  },
  {
    icon: BookmarkCheck,
    title: "Keep",
    body: "Save an answer and its evidence straight into your notes, or turn any source into a flashcard deck.",
  },
];

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="bg-aurora min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Open workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-24 md:py-32">
          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tighter md:text-7xl lg:text-8xl">
            Read papers.
            <br />
            <span className="text-muted-foreground">Ask anything.</span>
            <br />
            Keep the evidence.
          </h1>

          <p className="mt-8 max-w-xl text-balance text-lg text-muted-foreground">
            Noteworthy is an AI research workspace. Upload a paper, ask it questions, and get
            answers that cite the exact pages they came from.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6">
              <Link href={user ? "/dashboard" : "/signup"}>
                {user ? "Open workspace" : "Start for free"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            {!user && (
              <Button asChild variant="outline" size="lg" className="h-12 px-6">
                <Link href="/demo">Try the demo, no signup</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="grid gap-4 border-t border-border py-16 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-border/70 bg-card/50 p-6">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-4 text-lg font-medium tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section className="border-t border-border py-16">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Every answer is traceable.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Answers are generated only from passages retrieved out of your own documents. Each claim
            carries a citation chip; clicking it highlights the source text the model actually read.
            When the evidence is weak, Noteworthy says so instead of guessing.
          </p>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl border-t border-border px-6 py-10">
        <p className="text-xs text-muted-foreground">
          Noteworthy. An AI research workspace built with Next.js, Supabase, and pgvector.
        </p>
      </footer>
    </div>
  );
}
