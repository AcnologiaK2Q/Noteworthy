import type { ExtractedPage } from "./extractText";

export interface Chunk {
  chunkIndex: number;
  pageNumber: number;
  content: string;
  tokenCount: number;
}

const TARGET_TOKENS = 800;
const OVERLAP_TOKENS = 150;
const MIN_CHUNK_TOKENS = 20;

// Word count is a good enough proxy for tokens here; a real tokenizer would add
// a dependency without changing retrieval quality at this chunk size.
export function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

/**
 * Chunks page-by-page so every chunk keeps a real page number for citations.
 * Splits on sentence boundaries, with an overlap window so a fact spanning a
 * boundary still lands whole in at least one chunk.
 */
export function chunkPages(pages: ExtractedPage[]): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    for (const content of chunkOnePage(page.text)) {
      const tokenCount = estimateTokens(content);
      if (tokenCount < MIN_CHUNK_TOKENS) continue;

      chunks.push({ chunkIndex, pageNumber: page.pageNumber, content, tokenCount });
      chunkIndex += 1;
    }
  }

  return chunks;
}

function chunkOnePage(text: string): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentTokens + sentenceTokens > TARGET_TOKENS && current.length > 0) {
      chunks.push(current.join(" ").trim());
      const overlap = takeOverlap(current);
      current = overlap;
      currentTokens = overlap.reduce((sum, s) => sum + estimateTokens(s), 0);
    }

    current.push(sentence);
    currentTokens += sentenceTokens;
  }

  if (current.length > 0) chunks.push(current.join(" ").trim());

  return chunks.filter(Boolean);
}

function takeOverlap(sentences: string[]): string[] {
  const overlap: string[] = [];
  let tokens = 0;

  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    const sentenceTokens = estimateTokens(sentences[i]);
    if (tokens + sentenceTokens > OVERLAP_TOKENS) break;
    overlap.unshift(sentences[i]);
    tokens += sentenceTokens;
  }

  return overlap;
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z(\[])|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}
