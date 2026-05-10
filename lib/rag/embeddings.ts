import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

/**
 * Local sentence-transformer embeddings — no API key, no network calls after
 * the model is downloaded once. Uses Xenova/all-MiniLM-L6-v2 (384-dim).
 */
let _pipe: FeatureExtractionPipeline | null = null;

async function getPipe(): Promise<FeatureExtractionPipeline> {
  if (_pipe) return _pipe;
  _pipe = (await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  )) as FeatureExtractionPipeline;
  return _pipe;
}

async function embed(text: string): Promise<number[]> {
  const pipe = await getPipe();
  const out = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

export class LocalEmbeddings implements EmbeddingsInterface {
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (const t of texts) out.push(await embed(t));
    return out;
  }
  async embedQuery(text: string): Promise<number[]> {
    return embed(text);
  }
}
