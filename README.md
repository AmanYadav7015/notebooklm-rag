# NotebookLM RAG

A self-built version of Google NotebookLM. Upload a PDF or text file, then chat with it. Answers are grounded in the document's actual content via a full Retrieval-Augmented Generation (RAG) pipeline.

> Built for **GenAI Assignment 03**.

## Live demo

🔗 **Live URL:** _add your Vercel URL here after deploy_
🔗 **Source:** _add your GitHub URL here_

## What it does

1. User uploads a `.pdf`, `.txt`, or `.md` file.
2. The server **loads** the file, **chunks** it, **embeds** each chunk, and **stores** the embeddings in a vector database.
3. User asks a question.
4. The server **retrieves** the most relevant chunks for that question and asks an LLM to answer **using only those chunks** — answers come from the document, not the model's general knowledge.
5. Each answer ships with citations (filename + page number + snippet).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind |
| API | Next.js Route Handlers (Node runtime) |
| PDF loading | LangChain `PDFLoader` (page-aware) |
| Chunking | `RecursiveCharacterTextSplitter` (1000 / 200) |
| Embeddings | Google Gemini `text-embedding-004` |
| LLM | Google Gemini `gemini-2.0-flash` |
| Vector DB | Qdrant Cloud |
| Hosting | Vercel |

All providers used have a **free tier**, so the project can run end-to-end at $0.

## RAG pipeline

```
upload → load (PDFLoader)
       → chunk (RecursiveCharacterTextSplitter, 1000/200)
       → embed (Gemini text-embedding-004)
       → store (Qdrant Cloud, tagged with docId)
                       │
question → embed query │
       → retrieve top-4 chunks (filtered by docId)
       → prompt LLM with chunks as context
       → grounded answer + citations
```

### Chunking strategy

`RecursiveCharacterTextSplitter` with `chunkSize=1000`, `chunkOverlap=200`.

- Splits on paragraph → line → sentence → word boundaries, in that order. This preserves semantic continuity better than a flat character split.
- 1000 chars is large enough to hold a full thought; 200 chars of overlap stitches information that straddles a chunk boundary so a sentence cut in half is not lost during retrieval.
- Each chunk inherits its source metadata (`source` filename, `page` number) and is tagged with a per-upload `docId` so retrieval is isolated per document — uploading a second file does not contaminate answers about the first.

### Grounding

The system prompt instructs the LLM to answer **only** from the retrieved context, and to say _"I couldn't find that in the document."_ when the answer is not present. This prevents the model from falling back on its training data.

## Project structure

```
app/
  api/upload/route.ts   # POST: file → docs → chunks → vector store
  api/chat/route.ts     # POST: query → retrieve → LLM → answer
  page.tsx              # Upload + chat UI
  layout.tsx
  globals.css
components/
  Uploader.tsx
  Chat.tsx
lib/rag/
  load.ts               # PDF / text loader
  chunk.ts               # Chunking strategy
  store.ts               # Embeddings + Qdrant store + retrieval
  answer.ts              # Prompt + LLM call + citations
```

## Local setup

```bash
git clone <your-repo>
cd notebooklm-rag
npm install
cp .env.example .env.local
# fill in GOOGLE_API_KEY, QDRANT_URL, QDRANT_API_KEY
npm run dev
```

Visit http://localhost:3000.

### Getting the keys (free)

- **Gemini API key** → https://aistudio.google.com/apikey (Google account, free tier).
- **Qdrant Cloud** → https://cloud.qdrant.io → create a free cluster → copy `URL` and `API key`. The free tier is enough for this assignment.

## Deploy to Vercel

1. Push this folder to a public GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Under **Settings → Environment Variables**, add:
   - `GOOGLE_API_KEY`
   - `QDRANT_URL`
   - `QDRANT_API_KEY`
   - (optional) `QDRANT_COLLECTION` (defaults to `notebooklm`)
4. Deploy. Vercel detects Next.js automatically.

That's the live link to submit.

## How it satisfies the rubric

| Criterion | Where |
|---|---|
| GitHub repo | this repo |
| Live project | Vercel URL above |
| Ingestion | `lib/rag/load.ts` |
| Chunking (documented) | `lib/rag/chunk.ts` + this README |
| Embedding | `lib/rag/store.ts` (Gemini `text-embedding-004`) |
| Vector DB | Qdrant Cloud (`lib/rag/store.ts`) |
| Retrieval | `similaritySearch` filtered by `docId` |
| Generation grounded in retrieved context | `lib/rag/answer.ts` system prompt + context-only rule |
| Handles unseen documents | every upload gets a fresh `docId`; index is built at upload time |
