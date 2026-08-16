"use client";

import { useState } from "react";
import { Quote } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DemoExchange {
  question: string;
  answer: string;
  /** Pages the model cited. Empty when it declined to answer. */
  pages: number[];
  grounded: boolean;
}

interface EvidenceDemoProps {
  exchanges: DemoExchange[];
  /** Real passage text keyed by page, read from the indexed paper. */
  passages: Record<number, string>;
  paperTitle: string;
}

export function EvidenceDemo({ exchanges, passages, paperTitle }: EvidenceDemoProps) {
  const [active, setActive] = useState(0);
  const [openPage, setOpenPage] = useState<number | null>(null);

  const exchange = exchanges[active];

  function select(index: number) {
    setActive(index);
    setOpenPage(null);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
      <div className="flex flex-wrap gap-2 border-b border-border/60 p-3">
        {exchanges.map((item, index) => (
          <button
            key={item.question}
            onClick={() => select(index)}
            aria-pressed={index === active}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-xs transition-colors",
              index === active
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground hover:bg-card hover:text-foreground",
            )}
          >
            {item.question}
          </button>
        ))}
      </div>

      <div className="ruled p-6 md:p-8">
        <p className="text-sm font-medium">{exchange.question}</p>

        <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {exchange.answer}
        </div>

        {exchange.grounded ? (
          <div className="mt-6 border-t border-border/60 pt-4">
            <p className="mb-2.5 text-xs font-medium text-muted-foreground">
              Sources in {paperTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {exchange.pages.map((page) => (
                <button
                  key={page}
                  onClick={() => setOpenPage(openPage === page ? null : page)}
                  aria-expanded={openPage === page}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    openPage === page
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/15 text-secondary hover:bg-primary/30",
                  )}
                >
                  p.{page}
                </button>
              ))}
            </div>

            {openPage !== null && (
              <figure className="mt-4 border-l-2 border-primary/60 pl-4">
                <Quote className="mb-2 size-3.5 text-primary/70" />
                <blockquote className="text-xs leading-relaxed text-muted-foreground">
                  {passages[openPage] ?? "That passage is no longer in the index."}
                </blockquote>
                <figcaption className="mt-2 text-xs text-muted-foreground/70">
                  Page {openPage}, read straight from the indexed paper.
                </figcaption>
              </figure>
            )}
          </div>
        ) : (
          <p className="mt-6 border-t border-border/60 pt-4 text-xs text-warning">
            Nothing in the paper supports an answer, so it says so instead of guessing.
          </p>
        )}
      </div>
    </div>
  );
}
