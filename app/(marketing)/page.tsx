import Link from "next/link";
import { ArrowRight, BookmarkCheck, FileSearch, Quote } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import {
  EvidenceDemo,
  type DemoExchange,
} from "@/features/marketing/components/EvidenceDemo";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  {
    icon: FileSearch,
    title: "Upload",
    body: "Text is extracted page by page, split into passages, and embedded so it can be searched by meaning rather than keyword.",
  },
  {
    icon: Quote,
    title: "Ask",
    body: "Your question is matched against those passages. The model only sees what came back, and is told to answer from that alone.",
  },
  {
    icon: BookmarkCheck,
    title: "Keep",
    body: "Save an answer with its citations into your notes, or turn any paper into a flashcard deck scheduled by spaced repetition.",
  },
];

const BUILD = [
  ["Retrieval", "pgvector with an HNSW cosine index, inside the same Postgres as everything else"],
  ["Grounding", "Answers are refused when the closest passage falls below a similarity floor"],
  ["Isolation", "Row-level security on every table, scoped to the signed-in user"],
  ["Portability", "The model provider sits behind a one-file interface and can be swapped"],
];

/**
 * Real exchanges recorded against the indexed paper. The answers are verbatim
 * model output; the passages behind each citation are read live from the
 * database, so nothing here is a mock-up.
 */
const EXCHANGES: DemoExchange[] = [
  {
    question: "How many layers does the encoder have?",
    answer: "The encoder is composed of a stack of N = 6 identical layers [1].",
    pages: [3],
    grounded: true,
  },
  {
    question: "What methodology did the researchers use?",
    answer:
      "The researchers used various methodologies, including:\n• applying dropout to the output of each sub-layer [1]\n• using label smoothing of value ϵls = 0.1 [1]\n• employing beam search with a beam size of 4 and length penalty α = 0.6 [1]\n• experimenting with different model variations, such as changing the number of attention heads and dropout rates [2]",
    pages: [8, 9],
    grounded: true,
  },
  {
    question: "What is the recommended daily intake of vitamin D?",
    answer:
      "The excerpts do not contain information about the recommended daily intake of vitamin D for adults.",
    pages: [],
    grounded: false,
  },
];

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#evidence", label: "See it work" },
  { href: "#build", label: "Under the hood" },
];

export default async function LandingPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: demoDoc } = await supabase
    .from("documents")
    .select("id, title, page_count")
    .eq("is_demo", true)
    .eq("status", "ready")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Pull the actual passages behind the cited pages so the demo quotes the
  // paper rather than a hardcoded string.
  const citedPages = Array.from(new Set(EXCHANGES.flatMap((e) => e.pages)));
  const passages: Record<number, string> = {};

  if (demoDoc) {
    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("page_number, content")
      .eq("document_id", demoDoc.id)
      .in("page_number", citedPages);

    for (const chunk of chunks ?? []) {
      if (chunk.page_number && !passages[chunk.page_number]) {
        passages[chunk.page_number] = `${chunk.content.slice(0, 320).trim()}…`;
      }
    }
  }

  return (
    <div className="bg-aurora min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" aria-label="Noteworthy home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-24 md:py-32">
          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tighter md:text-7xl lg:text-8xl">
            Read papers.
            <br />
            <span className="text-muted-foreground">Ask anything.</span>
            <br />
            Keep the <span className="marker marker-draw">evidence</span>.
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

        <section id="how" className="scroll-mt-20 border-t border-border py-16 md:py-20">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            How it works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="rounded-2xl border border-border/60 bg-card/40 p-6"
              >
                <Icon className="size-5 text-primary" />
                <h3 className="mt-4 text-lg font-medium tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="evidence" className="scroll-mt-20 border-t border-border py-16 md:py-20">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            See it work
          </h2>
          <p className="mt-6 max-w-2xl text-2xl font-medium leading-snug tracking-tight md:text-3xl">
            Pick a question. Then open a citation and read the passage the answer{" "}
            <span className="marker">actually rests on</span>.
          </p>

          <div className="mt-8">
            {demoDoc ? (
              <EvidenceDemo
                exchanges={EXCHANGES}
                passages={passages}
                paperTitle={demoDoc.title}
              />
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                The demo paper has not been seeded yet.
              </p>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Answers are real model output recorded against{" "}
            {demoDoc ? demoDoc.title : "the demo paper"}
            {demoDoc?.page_count ? `, ${demoDoc.page_count} pages` : ""}. Passages are read live
            from the index.
          </p>
        </section>

        <section id="build" className="scroll-mt-20 border-t border-border py-16 md:py-20">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Under the hood
          </h2>
          <p className="mt-6 max-w-2xl text-2xl font-medium leading-snug tracking-tight md:text-3xl">
            Grounding is enforced by the system, not asked for in a prompt.
          </p>

          <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {BUILD.map(([term, detail]) => (
              <div key={term} className="border-t border-border/60 pt-4">
                <dt className="text-sm font-medium">{term}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>

          <Button asChild variant="ghost" size="sm" className="mt-8 px-0">
            <a
              href="https://github.com/AcnologiaK2Q/Noteworthy"
              target="_blank"
              rel="noreferrer noopener"
            >
              Read the source
              <ArrowRight className="size-3.5" />
            </a>
          </Button>
        </section>

        <section className="border-t border-border py-20 md:py-28">
          <p className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Bring a paper you have been putting off.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6">
              <Link href={user ? "/dashboard" : "/signup"}>
                {user ? "Open workspace" : "Create your workspace"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" size="lg" className="h-12 px-6">
                <Link href="/demo">Try it without an account</Link>
              </Button>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10">
          <p className="text-xs text-muted-foreground">
            An AI research workspace built with Next.js, Supabase, and pgvector.
          </p>
          <a
            href="https://github.com/AcnologiaK2Q/Noteworthy"
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
