"use client";
import { useState } from "react";

type Props = {
  onIndexed: (info: { docId: string; filename: string; chunkCount: number }) => void;
};

export default function Uploader({ onIndexed }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      onIndexed(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <label className="block">
        <div className="mb-2 text-sm text-zinc-400">
          Upload a PDF, .txt, or .md file
        </div>
        <input
          type="file"
          accept=".pdf,.txt,.md"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-white hover:file:bg-indigo-500 disabled:opacity-50"
        />
      </label>
      {busy && (
        <p className="mt-3 text-sm text-indigo-400">
          Indexing… chunking, embedding, and uploading to vector store.
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
