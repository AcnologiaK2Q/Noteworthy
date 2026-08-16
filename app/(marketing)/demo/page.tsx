import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

import { StartDemoButton } from "./StartDemoButton";

export const metadata = { title: "Demo" };

export default async function DemoPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: demoDocs } = await supabase
    .from("documents")
    .select("id, title, page_count")
    .eq("is_demo", true)
    .eq("status", "ready")
    .order("created_at", { ascending: true });

  // Already signed in — no reason to sit on the demo gate.
  if (user && demoDocs?.length) {
    redirect(`/documents/${demoDocs[0].id}`);
  }

  return (
    <div className="bg-aurora grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <Link href="/" className="inline-block">
          <Logo />
        </Link>

        <h1 className="mt-10 text-3xl font-semibold tracking-tight">Try it on a real paper</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No signup. Ask questions against a pre-loaded research paper and click any citation to see
          the exact passage the answer came from.
        </p>

        {!demoDocs || demoDocs.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-8">
            <p className="text-sm text-muted-foreground">
              No demo paper has been seeded yet. Run{" "}
              <code className="rounded bg-background/70 px-1 py-0.5 font-mono text-xs">
                npm run seed:demo
              </code>{" "}
              to load one.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/signup">Create an account instead</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="mt-8 grid gap-2 text-left">
              {demoDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="rounded-xl border border-border/70 bg-card/60 px-4 py-3 text-sm"
                >
                  {doc.title}
                  {doc.page_count && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {doc.page_count} pages
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <StartDemoButton documentId={demoDocs[0].id} />

            <p className="mt-4 text-xs text-muted-foreground">
              Creates a temporary guest session. Uploads are disabled in the demo.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
