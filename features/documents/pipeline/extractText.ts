import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  pageCount: number;
}

export async function extractPdfPages(data: ArrayBuffer): Promise<ExtractionResult> {
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { text, totalPages } = await extractText(pdf, { mergePages: false });

  const pages = (text as string[])
    .map((pageText, index) => ({
      pageNumber: index + 1,
      text: normalizeWhitespace(pageText),
    }))
    .filter((page) => page.text.length > 0);

  return { pages, pageCount: totalPages };
}

// PDF extraction leaves hard-wrapped lines and stray spacing that would
// otherwise fragment chunks mid-sentence.
function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/-\n(?=[a-z])/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
