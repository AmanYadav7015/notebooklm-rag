import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { loadFromBuffer } from "@/lib/rag/load";
import { chunkDocuments } from "@/lib/rag/chunk";
import { addChunks } from "@/lib/rag/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const docs = await loadFromBuffer(buf, file.name);
    const docId = uuid();
    const chunks = await chunkDocuments(
      docs.map((d) => ({
        ...d,
        metadata: { ...d.metadata, source: file.name },
      })),
      docId
    );

    await addChunks(chunks);

    return NextResponse.json({
      docId,
      filename: file.name,
      chunkCount: chunks.length,
      pageCount: docs.length,
    });
  } catch (e: any) {
    console.error("upload error", e);
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
