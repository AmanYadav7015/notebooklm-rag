import { QdrantVectorStore } from "@langchain/qdrant";
import type { Document } from "@langchain/core/documents";
import { LocalEmbeddings } from "./embeddings";

const COLLECTION = process.env.QDRANT_COLLECTION || "notebooklm_minilm";

export function getEmbeddings() {
  return new LocalEmbeddings();
}

/**
 * Add chunks to the shared collection. Collection is created on first use
 * via QdrantVectorStore.fromDocuments. We then ensure a payload index exists
 * on metadata.docId so per-doc filtering works under Qdrant strict mode.
 */
export async function addChunks(chunks: Document[]) {
  const embeddings = getEmbeddings();
  await QdrantVectorStore.fromDocuments(chunks, embeddings, {
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: COLLECTION,
  });
  await ensureDocIdIndex();
}

async function ensureDocIdIndex() {
  const url = `${process.env.QDRANT_URL}/collections/${COLLECTION}/index`;
  await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.QDRANT_API_KEY ?? "",
    },
    body: JSON.stringify({
      field_name: "metadata.docId",
      field_schema: "keyword",
    }),
  }).catch(() => {});
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
