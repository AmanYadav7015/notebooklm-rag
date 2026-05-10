import type { EmbeddingsInterface } from "@langchain/core/embeddings";

/**
 * Embeddings via Hugging Face Inference API.
 * Free tier, no model download at runtime — works on serverless.
 *
 * Model: sentence-transformers/all-MiniLM-L6-v2 (384-dim).
 */
const MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const URL = `https://router.huggingface.co/hf-inference/models/${MODEL}/pipeline/feature-extraction`;

async function embed(text: string): Promise<number[]> {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN env var is not set");

  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text,
      options: { wait_for_model: true },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HF embed failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as number[] | number[][];
  // Pipeline returns a flat vector for a single string. Some models return [[...]]
  if (Array.isArray(json[0])) return json[0] as number[];
  return json as number[];
}

export class LocalEmbeddings implements EmbeddingsInterface {
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    // Sequential to stay friendly with the free tier rate limit.
    for (const t of texts) out.push(await embed(t));
    return out;
  }
  async embedQuery(text: string): Promise<number[]> {
    return embed(text);
  }
}
