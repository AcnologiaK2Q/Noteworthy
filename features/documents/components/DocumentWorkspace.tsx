"use client";

import { useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/types/database.types";

import { DocChatPanel } from "./DocChatPanel";

export interface ChunkPreview {
  id: string;
  pageNumber: number | null;
  content: string;
}

interface DocumentWorkspaceProps {
  documentId: string;
  documentTitle: string;
  ready: boolean;
  chunks: ChunkPreview[];
}

/**
 * Left pane is the extracted source text; right pane asks questions of it.
 * Clicking a citation scrolls the matching passage into view and highlights it,
 * so every answer can be traced back to the evidence behind it.
 */
export function DocumentWorkspace({
  documentId,
  documentTitle,
  ready,
  chunks,
}: DocumentWorkspaceProps) {
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  const chunkRefs = useRef(new Map<string, HTMLElement>());

  const pages = useMemo(() => groupByPage(chunks), [chunks]);

  function revealCitation(citation: Citation) {
    setActiveChunkId(citation.chunkId);
    chunkRefs.current.get(citation.chunkId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_26rem]">
      <section className="min-h-0 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r">
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No extracted text yet. It appears here once processing finishes.
          </p>
        ) : (
          pages.map(({ pageNumber, items }) => (
            <div key={pageNumber ?? "unknown"} className="mb-8">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {pageNumber ? `Page ${pageNumber}` : "Page unknown"}
              </p>

              {items.map((chunk) => (
                <p
                  key={chunk.id}
                  ref={(el) => {
                    if (el) chunkRefs.current.set(chunk.id, el);
                    else chunkRefs.current.delete(chunk.id);
                  }}
                  className={cn(
                    "mb-3 rounded-lg px-3 py-2 text-sm leading-relaxed transition-colors",
                    activeChunkId === chunk.id
                      ? "bg-primary/20 ring-1 ring-primary/50"
                      : "text-muted-foreground",
                  )}
                >
                  {chunk.content}
                </p>
              ))}
            </div>
          ))
        )}
      </section>

      <aside className="flex min-h-0 flex-col bg-card/30">
        <DocChatPanel
          documentId={documentId}
          documentTitle={documentTitle}
          ready={ready}
          onCiteClick={revealCitation}
        />
      </aside>
    </div>
  );
}

function groupByPage(chunks: ChunkPreview[]) {
  const groups: { pageNumber: number | null; items: ChunkPreview[] }[] = [];

  for (const chunk of chunks) {
    const last = groups.at(-1);
    if (last && last.pageNumber === chunk.pageNumber) last.items.push(chunk);
    else groups.push({ pageNumber: chunk.pageNumber, items: [chunk] });
  }

  return groups;
}
