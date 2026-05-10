"use client";
import { useState } from "react";

type Citation = { page?: number | string; source?: string; snippet: string };
type Msg = { role: "user" | "assistant"; content: string; citations?: Citation[] };

export default function Chat({ docId, filename }: { docId: string; filename: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, docId }),
      });
      const text = await res.text();
      let json: { answer?: string; citations?: Citation[]; error?: string } = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
      }
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status} ${res.statusText}`);
      }
      setMessages((m) => [
        ...m,
        { role: "assistant", content: json.answer ?? "", citations: json.citations },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-zinc-500">
        Chatting with: <span className="text-zinc-300">{filename}</span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 min-h-[280px]">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Ask anything about the document. Answers are grounded in retrieved chunks.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "self-end max-w-[80%] rounded-lg bg-indigo-600/90 px-3 py-2 text-sm"
                : "self-start max-w-[85%] rounded-lg bg-zinc-800 px-3 py-2 text-sm whitespace-pre-wrap"
            }
          >
            {m.content}
            {m.citations && m.citations.length > 0 && (
              <details className="mt-2 text-xs text-zinc-400">
                <summary className="cursor-pointer">Sources ({m.citations.length})</summary>
                <ul className="mt-1 space-y-1">
                  {m.citations.map((c, j) => (
                    <li key={j} className="border-l-2 border-zinc-700 pl-2">
                      {c.source} {c.page ? `· page ${c.page}` : ""}
                      <div className="text-zinc-500">{c.snippet}…</div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
        {busy && <p className="text-xs text-zinc-500">Thinking…</p>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question about the document…"
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
