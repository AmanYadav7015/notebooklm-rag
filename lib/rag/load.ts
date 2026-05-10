import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import type { Document } from "@langchain/core/documents";

/**
 * Load a Buffer (uploaded file) into LangChain Documents.
 * - PDF: parsed page-by-page (each page becomes one Document with metadata.page)
 * - Text: a single Document
 */
export async function loadFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<Document[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
    const loader = new PDFLoader(blob, { splitPages: true });
    return await loader.load();
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    const text = buffer.toString("utf-8");
    return [
      {
        pageContent: text,
        metadata: { source: filename },
      } as Document,
    ];
  }
  throw new Error("Unsupported file type. Upload a .pdf, .txt, or .md file.");
}
