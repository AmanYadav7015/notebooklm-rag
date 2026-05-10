import { pipeline, env } from "@huggingface/transformers";
import type { EmbeddingsInterface } from "@langchain/core/embeddings";

// On Vercel/serverless, only /tmp is writable. Point the model cache there.
env.cacheDir = "/tmp/transformers-cache";
env.allowLocalModels = false;

/**
 * Local sentence-transformer embeddings — no API key, no network calls after
 * the model is downloaded once. Uses Xenova/all-MiniLM-L6-v2 (384-dim).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pipe: any = null;

async function getPipe(): Promise<any> {
  if (_pipe) return _pipe;
  _pipe = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
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
