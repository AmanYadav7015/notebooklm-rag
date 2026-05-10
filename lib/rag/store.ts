import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import type { Document } from "@langchain/core/documents";

const COLLECTION = process.env.QDRANT_COLLECTION || "notebooklm";

export function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "text-embedding-004",
  });
}

/**
 * Add chunks to the shared collection. Collection is created on first use
 * via QdrantVectorStore.fromDocuments.
 */
export async function addChunks(chunks: Document[]) {
  const embeddings = getEmbeddings();
  await QdrantVectorStore.fromDocuments(chunks, embeddings, {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION,
  });
}

/**
 * Retrieve top-k chunks for a query, scoped to a single uploaded docId.
 */
export async function similaritySearch(
  query: string,
  docId: string,
  k = 4
): Promise<Document[]> {
  const embeddings = getEmbeddings();
  const store = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION,
  });

  return await store.similaritySearch(query, k, {
    must: [{ key: "metadata.docId", match: { value: docId } }],
  });
}

export { COLLECTION };
