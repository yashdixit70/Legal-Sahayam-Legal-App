# ⚖️ Legal Sahayam

**An AI-grounded legal-assistance web app for India.** Know your rights, understand the IPC/BNS section that applies to your situation, get the right helpline in one tap — and talk to a chatbot that answers only from a curated, fact-checked legal knowledge base, never from invented law. The assistant **streams answers live, reads them aloud, and listens to your voice** — built for people in crisis who often can't type, let alone read a statute.

Submission for the **Razorpay Buildathon**.

---

## Problem statement & who it's for

Most Indians facing a legal situation — a threat, domestic violence, harassment, an arrest, an online scam, a property dispute — do not know their rights, which section of the IPC/BNS applies, or even which number to call. Legal information is scattered across government portals, legal jargon, and unreliable AI chatbots that confidently invent section numbers.

Legal Sahayam is for the person **without a lawyer, without a budget, and without time**: a one-page, mobile-first assistant that answers in plain language (including Hinglish), renders emergency + helpline numbers as tap-to-call, walks through what to do step-by-step per situation, and points to *free* legal aid (NALSA, Art. 39A) when a licensed lawyer is actually needed.

**Content scope:** 38 curated knowledge-base chunks, 19 IPC/BNS sections, 9 constitutional rights, 8 situation guides, 15 helplines, 4 legal-aid cards.

## Architecture

Zero-build static site on GitHub Pages. There is intentionally **no backend**: GitHub Pages serves only static files, so the Gemini API is called directly from the browser. This is acceptable for a demo; the production answer (a key-hiding proxy) is documented under *Where we used AI and why*.

```
┌──────────────────────────────────────────────────────────────┐
│  index.html  (all content containers rendered in JS)         │
│   css/style.css                                              │
│                                                              │
│  data/legalContent.js  ←— SINGLE SOURCE OF TRUTH             │
│    RIGHTS · IPC_SECTIONS · SCENARIOS · CONTACTS ·            │
│    EMERGENCIES · LEGAL_AID · KNOWLEDGE_BASE (RAG chunks)     │
└────────────┬─────────────────────────────────────┬───────────┘
             │ renders page                         │ retrieved context
             ▼                                       ▼
js/render.js ────────► page cards            js/rag.js (RAG engine)
js/app.js ───────────► UI wiring, SOS, nav      │ 1. embed KB (Gemini
                                               │    text-embedding-004)
                                              │ 2. embed query, cosine
js/chatbot.js ◄────► AI / offline orchestration │    top-k retrieval
                                  │            │ 3. generate answer
                                  │            │    grounded in top-k
                    ┌─────────────┴──────────┐  │ 4. relevance gate &
                    ▼                        ▼                    error chain
        js/rag.js ──► Gemini API        js/bot.js ──► offline keyword
        (key set via 🔑 in chat)        fallback (no key / no net /
                                               API failure / off-topic)
```

**Data flow for a chat message:**

1. User asks a question — by typing or via the 🎙️ microphone (browser SpeechRecognition).
2. The bot (wearing a custom SVG lawyer avatar — see `js/avatar.js`) opens a streaming bubble.
3. If a Gemini key is present → `streamRagAnswer()` embeds the query, cosine-scans all 38 KB chunks, takes top-4.
4. If the top score is below the relevance threshold, the model is **not allowed to answer** (an off-topic query gets redirected instead of hallucinated).
5. Otherwise the top-4 chunks are injected into the system prompt as *CONTEXT* with hard rules forbidding anything not present in it; `gemini-2.0-flash` (temperature 0.2) writes the answer and streams it **token-by-token over SSE** so it appears live.
6. Every answer carries the disclaimer, returns its source chunks (shown as chips), and **reads itself aloud** via the browser's TTS (toggle 🔊/🔇 in the header).
7. Any failure — missing key, network, HTTP error, mid-stream drop, or empty/safety-filtered response — **falls back to `offlineReply()`**, a deterministic keyword engine over the same data layer, and the header shows which mode produced the answer.

## Tech stack

| Choice | Why |
| --- | --- |
| Vanilla ES modules, no framework | The app is a single information page + a chat widget. A framework would add build tooling, a virtual-DOM diff, and bundle complexity for zero user value here — the smallest thing that fully works is the right thing. |
| GitHub Pages (static) | Free, always-on hosting that matches the zero-backend architecture. One push → live. |
| Gemini `gemini-2.0-flash` + `text-embedding-004` | Free tier, generous limits, and the embeddings API is **CORS-enabled** — the only well-known embedding provider that works directly from a browser, which is exactly what a static-host chatbot needs. |
| RAG over a 38-chunk curated KB | The whole product thesis: flexible natural-language Q&A that cannot invent legal facts (see below). |
| Keyword/scenario offline fallback | Guarantees the app is never dead-in-the-water: no key, no network, or an API outage degrades to correct curated answers instead of an error. |
| Gemini `streamGenerateContent` (SSE) | Answers stream live instead of appearing after a fake delay — the demo feels real because it is real streaming, and partial output ships even if the connection drops mid-answer. |
| Browser-native Web Speech (TTS + SpeechRecognition) | Voice costs nothing, works without the API key, and keeps speech on-device — no extra cloud dependency for a crisis-use product (see "Where we did NOT use AI"). |
| `data/legalContent.js` as single source of truth | The page cards, the scenario guides, and the robot's grounding context are all generated from one curated dataset, so what the bot says and what the page shows can never drift apart. |

## Setup & run

**Run locally:** just open `index.html` in a browser (or `npx serve .`). No installs, no build step.

**Run the tests:**

```bash
npm install     # not strictly needed — just adds the `test` script runner
npm test        # runs tests/smoke.mjs against the real modules (no network needed)
```

**Enable the AI chatbot (for the live demo):**

1. Get a free Gemini API key: <https://aistudio.google.com/apikey>
2. Open the site → click the **🔑** button in the chat header → paste the key.
3. The key is stored **only in your browser's localStorage** — it is never committed to the repo and never leaves your machine. Close the tab and it's gone.

Without a key the chatbot still works (offline mode) — it just can't answer paraphrased or Hinglish questions only an LLM can handle.

## Where we used AI and why

Three realistic options for the chatbot were considered:

| Option | Verdict |
| --- | --- |
| **Static FAQ** | Wrong tool. FAQ matching breaks on paraphrase ("I'm in trouble and scared, someone keeps calling me" won't hit a canned FAQ row), can't handle Hinglish/Hindi, and grows a brittle pattern-matching blob the moment it tries to be flexible. |
| **Ungrounded LLM** | Wrong — *and dangerous here*. An LLM told to "answer about IPC sections" will happily invent IPC 507, wrong punishment ranges, or a fake helpline. In legal information, hallucination is not a quality bug, it's a harm bug. |
| **RAG over a curated KB** ✅ | Right tool. The LLM keeps paraphrase tolerance, Hinglish fluency, and natural phrasing, while a small hand-checked corpus acts as a hard boundary: the system prompt forbids anything not present in retrieved context, low-relevance queries are refused outright, and answers display their source chips for auditability. |

AI is used where it adds judgment power (understanding the question, phrasing the answer); it is gated where precision is non-negotiable.

## Where we deliberately did NOT use AI and why

- **The legal facts themselves** are hand-curated and cross-checked (IPC/BNS text, Constitution articles, government helplines). Generating legal text with an LLM and then verifying it would be strictly worse than writing 38 short entries by hand — verification of legal text is harder than writing it.
- **Retrieval** uses plain cosine similarity over 38 chunks, not a vector database. Semantic-search infra (Pinecone/Chroma + ETL) exists to manage *millions* of documents; spinning it up for 38 items would be using AI/engineering as a costume, not as a solution. Embeddings are the only AI involved, and only because they add paraphrase tolerance the phone directory‑style lookup lacks.
- **The offline fallback** is a deterministic keyword engine. When the LLM is unreachable, adding more AI is backwards — the right move is a correct, fast, boring lookup.
- **Voice in/out uses browser-native engines, not AI speech models.** Speech-to-text runs on the browser's `SpeechRecognition` (mostly on-device) and text-to-speech on the OS `speechSynthesis` — deliberately **not** an AI TTS/ASR model. Reasons: it costs nothing and works without the API key, it keeps a user's voice on the device (a privacy win for a product used in dangerous situations), and it is one fewer cloud dependency to fail. We used the built-in tool where a generative model would add risk and cost with no benefit.
- **The page itself** (cards, contacts, SOS, speed dial) is plain DOM rendering. There is no reason to involve a model in showing a phone number.
- **UI/UX** — no AI-generated copy or component; humans wrote the instructions that must be calm and precise in a crisis. The bot's lawyer **avatar is a hand-drawn SVG** (`js/avatar.js`), not an AI image.

The line: **AI reasons, humans decide the facts.**

## Failure recovery (see DEVLOG.md)

- `index.html` previously 404'd (redirect to a misspelled filename) — root cause and fix in DEVLOG.
- A previous "AI" build shipped with provider stubs disabled — it was keyword matching wearing an "AI-powered" label. Rebuilt honestly (DEVLOG).
- Duplicated data (page cards, bot KB, scenario rules in three files) drifted — NALSA's number and section counts disagreed across surfaces. Consolidated into one data layer (DEVLOG).
- The RAG answering path is wrapped so any Gemini failure drops to the offline engine with a visible mode badge — the demo cannot hang, error, or hallucinate.

## Tests

`tests/smoke.mjs` + `tests/dom-smoke.mjs` (`npm test`). Module-level suite verifies: KB integrity (38 unique chunks with sources), 8 offline keyword paths, RAG grounding (top source = correct chunk), disclaimer presence, off-topic rejection (no hallucination), clean rejection on API failure, and **SSE streaming** (tokens delivered via the same `onToken` path the UI uses). The DOM suite boots the real `render.js` + `chatbot.js` against a minimal DOM stub to prove page rendering and chat init wire up without errors. All offline — runs anywhere Node exists.

## License / disclaimer

Informational purposes only. Legal Sahayam is **not** legal advice and not a substitute for a licensed advocate. In India, people who cannot afford counsel have a constitutional right to free legal aid (Art. 39A) — call NALSA at **15100**.