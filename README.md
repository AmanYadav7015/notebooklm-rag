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
| Embeddings | Hugging Face Inference API (`sentence-transformers/all-MiniLM-L6-v2`) |
| LLM | Groq (`llama-3.1-8b-instant`) |
| Vector DB | Qdrant Cloud |
| Hosting | Vercel |

All providers used have a **free tier**, so the project can run end-to-end at $0.

## RAG pipeline (CRAG — Corrective RAG)

```
upload → load (PDFLoader)
       → chunk (RecursiveCharacterTextSplitter, 1000/200)
       → embed (HF all-MiniLM-L6-v2)
       → store (Qdrant Cloud, tagged with docId)
                       │
question → embed query │
       → retrieve top-4 chunks (filtered by docId)
       → GRADE each chunk for relevance (LLM, 0..1)
            ├─ max score ≥ 0.7  → use chunks as-is
            ├─ otherwise        → REWRITE query → retrieve again,
            │                     merge + rerank by grade, keep ≥ 0.3
            └─ still nothing    → answer "couldn't find that in the document"
       → prompt LLM with surviving chunks as context
       → grounded answer + citations + CRAG trace
```

### Why CRAG

Plain RAG always feeds the top-k chunks to the LLM, even when they are weak
matches — which produces confident answers built on irrelevant context. CRAG
adds a self-check: a lightweight grader scores each retrieved chunk, and on a
bad retrieval the system **corrects** itself by rewriting the question into a
denser search query and trying again. Only chunks that pass the relevance bar
are sent to the answering LLM, so the final answer is either well-grounded or
honestly refused. The `/api/chat` response includes a `trace` field with the
grades, any rewritten query, and the action taken (`use` / `rewrite` /
`insufficient`).

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
  chunk.ts              # Chunking strategy
  store.ts              # Embeddings + Qdrant store + retrieval
  crag.ts               # Corrective RAG: grade → rewrite → re-retrieve
  answer.ts             # Prompt + LLM call + citations
```

## Local setup

```bash
git clone <your-repo>
cd notebooklm-rag
npm install
cp .env.example .env.local
# fill in GROQ_API_KEY, QDRANT_URL, QDRANT_API_KEY
npm run dev
```

Visit http://localhost:3000.

### Getting the keys (all free)

- **Groq API key** (LLM) → https://console.groq.com/keys → sign in with Google → "Create API Key".
- **Hugging Face token** (embeddings) → https://huggingface.co/settings/tokens → "Create new token" → type "Read".
- **Qdrant Cloud** → https://cloud.qdrant.io → create a free cluster → copy `URL` (with `:6333`) and `API key`.

## Deploy to Vercel

1. Push this folder to a public GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Under **Settings → Environment Variables**, add:
   - `GROQ_API_KEY`
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
| Embedding | `lib/rag/store.ts` (Gemini `embedding-001`) |
| Vector DB | Qdrant Cloud (`lib/rag/store.ts`) |
| Retrieval | `similaritySearch` filtered by `docId` |
| Generation grounded in retrieved context | `lib/rag/answer.ts` system prompt + context-only rule |
| Handles unseen documents | every upload gets a fresh `docId`; index is built at upload time |
