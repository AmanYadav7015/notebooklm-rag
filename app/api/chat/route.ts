import { NextRequest, NextResponse } from "next/server";
import { similaritySearch } from "@/lib/rag/store";
import { answerWithContext } from "@/lib/rag/answer";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { question, docId } = await req.json();
    if (!question || !docId) {
      return NextResponse.json(
        { error: "question and docId are required" },
        { status: 400 }
      );
    }

    const chunks = await similaritySearch(question, docId, 4);
    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find anything relevant in the document.",
        citations: [],
      });
    }

    const { answer, citations } = await answerWithContext(question, chunks);
    return NextResponse.json({ answer, citations });
  } catch (e: any) {
    const detail = e?.message || String(e);
    console.error("chat error", detail, e);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
