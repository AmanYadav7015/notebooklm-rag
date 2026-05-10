"use client";
import { useState } from "react";
import Uploader from "@/components/Uploader";
import Chat from "@/components/Chat";

export default function Page() {
  const [doc, setDoc] = useState<{
    docId: string;
    filename: string;
    chunkCount: number;
  } | null>(null);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">NotebookLM RAG</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload a document, ask questions, get answers grounded in its content.
        </p>
      </header>

      {!doc ? (
        <Uploader onIndexed={setDoc} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm">
            <div>
              <span className="text-zinc-300">{doc.filename}</span>
              <span className="ml-2 text-zinc-500">
                · {doc.chunkCount} chunks indexed
              </span>
            </div>
            <button
              onClick={() => setDoc(null)}
              className="text-xs text-zinc-400 underline hover:text-zinc-200"
            >
              upload another
            </button>
          </div>
          <Chat docId={doc.docId} filename={doc.filename} />
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-zinc-600">
        Gemini · Qdrant · LangChain · Next.js
      </footer>
    </main>
  );
}
