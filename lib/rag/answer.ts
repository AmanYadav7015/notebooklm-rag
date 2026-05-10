import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { Document } from "@langchain/core/documents";

export type Citation = {
  page?: number | string;
  source?: string;
  snippet: string;
};

export async function answerWithContext(
  question: string,
  chunks: Document[]
): Promise<{ answer: string; citations: Citation[] }> {
  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "gemini-2.0-flash",
    temperature: 0.2,
  });

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

  const res = await llm.invoke([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const answer =
    typeof res.content === "string"
      ? res.content
      : Array.isArray(res.content)
      ? res.content.map((p: any) => p.text ?? "").join("")
      : String(res.content);

  const citations: Citation[] = chunks.map((c) => ({
    page: c.metadata?.loc?.pageNumber ?? c.metadata?.page,
    source: c.metadata?.source,
    snippet: c.pageContent.slice(0, 220),
  }));

  return { answer, citations };
}
