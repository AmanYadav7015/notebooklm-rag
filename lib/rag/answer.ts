import type { Document } from "@langchain/core/documents";

export type Citation = {
  page?: number | string;
  source?: string;
  snippet: string;
};

const CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
const MODEL = "meta-llama/Llama-3.1-8B-Instruct:nebius";

export async function answerWithContext(
  question: string,
  chunks: Document[]
): Promise<{ answer: string; citations: Citation[] }> {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error("HF_TOKEN env var is not set");

  const context = chunks
    .map((c, i) => {
      const page = c.metadata?.loc?.pageNumber ?? c.metadata?.page ?? "?";
      const source = c.metadata?.source ?? "uploaded-doc";
      return `[chunk ${i + 1} | source: ${source} | page: ${page}]\n${c.pageContent}`;
    })
    .join("\n\n---\n\n");

  const system = `You are a careful assistant answering questions about an uploaded document.

Rules:
- Use ONLY the information in the CONTEXT below. Do not use outside knowledge.
- If the answer is not in the context, say: "I couldn't find that in the document."
- When useful, cite page numbers like (page 4).
- Be concise and direct.`;

  const user = `CONTEXT:
${context}

QUESTION: ${question}

ANSWER:`;

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HF chat failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const answer = json.choices?.[0]?.message?.content ?? "";

  const citations: Citation[] = chunks.map((c) => ({
    page: c.metadata?.loc?.pageNumber ?? c.metadata?.page,
    source: c.metadata?.source,
    snippet: c.pageContent.slice(0, 220),
  }));

  return { answer, citations };
}
