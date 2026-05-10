import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Document } from "@langchain/core/documents";

/**
 * Chunking strategy: RecursiveCharacterTextSplitter
 *
 * Why this strategy:
 *  - Splits along natural boundaries first (paragraphs → lines → sentences → words),
 *    preserving semantic continuity inside chunks.
 *  - 1000-char chunks are large enough to carry a full thought yet small enough
 *    that a top-k retrieval still fits comfortably inside the LLM context.
 *  - 200-char overlap stitches information that straddles chunk boundaries so a
 *    sentence cut in half is not lost from retrieval.
 *
 * Each output chunk inherits the source Document's metadata (page number, source
 * filename) so retrieved answers can cite the page they came from.
 */
export async function chunkDocuments(
  docs: Document[],
  docId: string
): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const split = await splitter.splitDocuments(docs);

  // Tag every chunk with the docId so we can isolate retrieval per uploaded doc.
  return split.map((d) => ({
    ...d,
    metadata: { ...d.metadata, docId },
  })) as Document[];
}
