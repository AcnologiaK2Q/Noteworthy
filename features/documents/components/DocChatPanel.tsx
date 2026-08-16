"use client";

import { useState } from "react";
import { BookmarkPlus, CornerDownLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveAnswerAsNote } from "@/features/notes/actions";
import type { Citation } from "@/lib/types/database.types";

interface Exchange {
  question: string;
  answer: string;
  citations: Citation[];
  grounded: boolean;
  saved: boolean;
}

interface DocChatPanelProps {
  documentId: string;
  documentTitle: string;
  ready: boolean;
  onCiteHover?: (chunkId: string | null) => void;
  onCiteClick?: (citation: Citation) => void;
}

const SUGGESTIONS = [
  "What methodology did the researchers use?",
  "Summarize the key findings.",
  "What limitations do the authors acknowledge?",
];

export function DocChatPanel({
  documentId,
  documentTitle,
  ready,
  onCiteClick,
}: DocChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setQuestion("");

    try {
      const response = await fetch(`/api/documents/${documentId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Request failed.");

      setExchanges((prev) => [
        ...prev,
        {
          question: trimmed,
          answer: result.answer,
          citations: result.citations ?? [],
          grounded: result.grounded ?? false,
          saved: false,
        },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not get an answer.");
      setQuestion(trimmed);
    } finally {
      setPending(false);
    }
  }

  async function save(index: number) {
    const exchange = exchanges[index];

    const { error } = await saveAnswerAsNote({
      documentId,
      documentTitle,
      question: exchange.question,
      answer: exchange.answer,
      citations: exchange.citations,
    });

    if (error) {
      toast.error(error);
      return;
    }

    setExchanges((prev) => prev.map((e, i) => (i === index ? { ...e, saved: true } : e)));
    toast.success("Saved to your notes.");
  }

  if (!ready) {
    return (
      <div className="grid h-full place-items-center p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This paper is still being processed. Questions unlock once it&apos;s ready.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
        {exchanges.length === 0 && !pending && (
          <div className="pt-8 text-center">
            <p className="text-sm text-muted-foreground">Ask anything about this paper.</p>
            <div className="mt-4 grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void ask(s)}
                  className="rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {exchanges.map((exchange, index) => (
          <article key={index} className="space-y-3">
            <p className="text-sm font-medium">{exchange.question}</p>

            <div className="rounded-xl border border-border/70 bg-card/60 p-4">
              <Markdown>{exchange.answer}</Markdown>

              {exchange.citations.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exchange.citations.map((citation) => (
                      <button
                        key={citation.chunkId}
                        onClick={() => onCiteClick?.(citation)}
                        title={citation.snippet}
                        className="rounded-md bg-primary/15 px-2 py-1 font-mono text-xs text-secondary transition-colors hover:bg-primary/30"
                      >
                        {citation.page ? `p.${citation.page}` : "source"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                {!exchange.grounded && (
                  <p className="text-xs text-warning">Weak match — verify against the paper.</p>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  disabled={exchange.saved}
                  onClick={() => void save(index)}
                >
                  <BookmarkPlus className="size-3.5" />
                  {exchange.saved ? "Saved" : "Save to notes"}
                </Button>
              </div>
            </div>
          </article>
        ))}

        {pending && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching the paper…
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="border-t border-border p-4"
      >
        <div className="relative">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
            placeholder="Ask about this paper…"
            rows={2}
            className="resize-none pr-12"
            disabled={pending}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-2 right-2 size-8"
            disabled={pending || !question.trim()}
            aria-label="Send question"
          >
            <CornerDownLeft className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
