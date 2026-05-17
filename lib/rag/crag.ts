import type { Document } from "@langchain/core/documents";
import { similaritySearch } from "./store";

const CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

export type CragAction = "use" | "rewrite" | "insufficient";

export type CragTrace = {
  initialQuery: string;
  rewrittenQuery?: string;
  gradesInitial: number[];
  gradesRewritten?: number[];
  action: CragAction;
};

async function groq(messages: { role: string; content: string }[], temperature = 0) {
  const token = process.env.GROQ_API_KEY;
  if (!token) throw new Error("GROQ_API_KEY env var is not set");
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: 200 }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq call failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

/**
 * Ask the LLM to score each chunk 0..1 for how well it answers the question.
 * Returns one score per chunk in input order; missing scores default to 0.
 */
export async function gradeDocuments(
  question: string,
  chunks: Document[]
): Promise<number[]> {
  if (chunks.length === 0) return [];

  const numbered = chunks
    .map((c, i) => `[${i + 1}] ${c.pageContent.slice(0, 600).replace(/\s+/g, " ")}`)
    .join("\n\n");

  const system =
    "You grade whether each passage is relevant to answering the user's question. " +
    "Return ONLY a JSON array of numbers between 0 and 1, one per passage, in order. " +
    "1 = directly answers the question, 0.5 = related but partial, 0 = unrelated. " +
    "No prose, no keys — just the array.";

  const user = `QUESTION: ${question}\n\nPASSAGES:\n${numbered}\n\nJSON array of ${chunks.length} numbers:`;

  const raw = await groq(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    0
  );

  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return chunks.map(() => 0);
  try {
    const arr = JSON.parse(match[0]) as unknown[];
    return chunks.map((_, i) => {
      const v = typeof arr[i] === "number" ? (arr[i] as number) : 0;
      return Math.max(0, Math.min(1, v));
    });
  } catch {
    return chunks.map(() => 0);
  }
}

/**
 * Rewrite a question into a denser, keyword-rich search query for re-retrieval.
 */
export async function rewriteQuery(question: string): Promise<string> {
  const system =
    "You rewrite questions into a single short search query (under 20 words) " +
    "optimised for retrieval over a document. Output ONLY the query — no quotes, no prose.";
  const out = await groq(
    [
      { role: "system", content: system },
      { role: "user", content: question },
    ],
    0.2
  );
  return out.trim().replace(/^["']|["']$/g, "").slice(0, 300) || question;
}

const HIGH = 0.7;
const LOW = 0.3;

/**
 * CRAG loop: retrieve → grade → optionally rewrite + retrieve again → return
 * the best chunks plus a trace of what happened.
 */
export async function runCrag(
  question: string,
  docId: string,
  k = 4
): Promise<{ chunks: Document[]; trace: CragTrace }> {
  const initial = await similaritySearch(question, docId, k);
  const gradesInitial = await gradeDocuments(question, initial);
  const maxInitial = gradesInitial.reduce((m, v) => Math.max(m, v), 0);

  const trace: CragTrace = {
    initialQuery: question,
    gradesInitial,
    action: "use",
  };

  if (maxInitial >= HIGH) {
    const good = initial.filter((_, i) => gradesInitial[i] >= LOW);
    return { chunks: good.length ? good : initial, trace };
  }

  trace.action = "rewrite";
  const rewritten = await rewriteQuery(question);
  trace.rewrittenQuery = rewritten;

  const second = await similaritySearch(rewritten, docId, k);
  const gradesRewritten = await gradeDocuments(question, second);
  trace.gradesRewritten = gradesRewritten;

  const merged = new Map<string, { doc: Document; score: number }>();
  initial.forEach((d, i) => merged.set(d.pageContent, { doc: d, score: gradesInitial[i] }));
  second.forEach((d, i) => {
    const prev = merged.get(d.pageContent);
    const s = gradesRewritten[i];
    if (!prev || s > prev.score) merged.set(d.pageContent, { doc: d, score: s });
  });

  const ranked = [...merged.values()]
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score >= LOW)
    .slice(0, k)
    .map((x) => x.doc);

  if (ranked.length === 0) {
    trace.action = "insufficient";
    return { chunks: [], trace };
  }

  return { chunks: ranked, trace };
}
