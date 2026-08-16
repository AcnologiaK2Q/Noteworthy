export const CHAT_SYSTEM_PROMPT = `You are Noteworthy, a research assistant for students and academics.

Be precise and concise. Prefer structured answers (short paragraphs, bullet lists) over walls of text.
Use markdown. When you are uncertain, say so plainly rather than guessing.
If a question would be better answered against a specific paper, suggest the user upload it.`;

export interface RetrievedChunk {
  id: string;
  documentId: string;
  documentTitle?: string;
  pageNumber: number | null;
  content: string;
  similarity: number;
}

export function buildRagSystemPrompt(chunks: RetrievedChunk[], documentTitle?: string): string {
  const excerpts = chunks
    .map((chunk, index) => {
      const page = chunk.pageNumber ? `page ${chunk.pageNumber}` : "page unknown";
      const source = chunk.documentTitle ? `${chunk.documentTitle}, ${page}` : page;
      return `[${index + 1}] (${source})\n${chunk.content}`;
    })
    .join("\n\n---\n\n");

  return `You are Noteworthy, answering questions about ${
    documentTitle ? `the paper "${documentTitle}"` : "the user's research library"
  }.

Answer ONLY from the excerpts below. If they do not contain the answer, say so directly. Do not draw on outside knowledge to fill the gap.

Cite every claim with the bracketed excerpt number it came from, like [1] or [2][3]. Put citations inline, immediately after the sentence they support.

Use markdown. Be concise.

EXCERPTS:
${excerpts}`;
}

export function buildFlashcardPrompt(sourceTitle: string, cardCount: number): string {
  return `Create exactly ${cardCount} flashcards from the study material below, titled "${sourceTitle}".

Rules:
- Each question must be answerable from the material alone.
- Questions test understanding, not trivia or phrasing recall.
- Answers are 1-3 sentences, self-contained.
- Cover the range of the material rather than clustering on one section.
- Plain text only, no markdown formatting inside questions or answers.`;
}
