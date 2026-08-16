import Link from "next/link";

import { Logo } from "@/components/layout/Logo";

/** A real recorded answer, shown as the artifact the product produces. */
const SAMPLE = {
  question: "How many layers does the encoder have?",
  answer: "The encoder is composed of a stack of N = 6 identical layers.",
  paper: "Attention Is All You Need",
  pages: [3],
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="bg-aurora hidden flex-col justify-between border-r border-border bg-card/30 p-12 lg:flex">
        <Link href="/" aria-label="Noteworthy home">
          <Logo animate />
        </Link>

        <div className="max-w-md">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight">
            Every claim, traceable.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Noteworthy answers only from the papers you give it, and shows you the page each
            claim came from. When the evidence is thin, it says so.
          </p>

          <figure className="mt-8 rounded-xl border border-border bg-background/40 p-5">
            <figcaption className="text-xs uppercase tracking-wider text-muted-foreground">
              Sample answer
            </figcaption>

            <p className="mt-4 text-sm font-medium">{SAMPLE.question}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{SAMPLE.answer}</p>

            <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
              <span className="text-xs text-muted-foreground">Sources</span>
              {SAMPLE.pages.map((page) => (
                <span
                  key={page}
                  className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-secondary"
                >
                  p.{page}
                </span>
              ))}
              <span className="truncate text-xs text-muted-foreground/70">{SAMPLE.paper}</span>
            </div>
          </figure>
        </div>

        <p className="text-xs text-muted-foreground">
          Your papers stay private. Every row is scoped to your account by database-level row
          security.
        </p>
      </aside>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <main className="w-full max-w-md">
          <Link href="/" className="mb-10 inline-block lg:hidden" aria-label="Noteworthy home">
            <Logo />
          </Link>
          {children}
        </main>
      </div>
    </div>
  );
}
