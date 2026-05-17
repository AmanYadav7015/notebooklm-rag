import { NextRequest, NextResponse } from "next/server";
import { answerWithContext } from "@/lib/rag/answer";
import { runCrag } from "@/lib/rag/crag";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let stage = "init";
  try {
    stage = "parse-body";
    const { question, docId } = await req.json();
    if (!question || !docId) {
      return NextResponse.json(
        { error: "question and docId are required" },
        { status: 400 }
      );
    }

    stage = "crag";
    const { chunks, trace } = await runCrag(question, docId, 4);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find that in the document.",
        citations: [],
        trace,
      });
    }

    stage = "llm-answer";
    const { answer, citations } = await answerWithContext(question, chunks);
    return NextResponse.json({ answer, citations, trace });
  } catch (e: any) {
    const detail = `[${stage}] ${e?.message || String(e)}`;
    console.error("chat error", detail, e);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
