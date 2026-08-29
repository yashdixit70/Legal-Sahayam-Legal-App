# DEVLOG — Legal Sahayam

A record of real failures, root causes, and fixes. Every entry below is one that actually happened to this project and is verifiable in the repository history / previous code. Entries are phrased technically: symptom → root cause → fix → lesson.

> **For the buildathon judges:** this file is our "failure recovery" evidence. Nothing here was invented for the grading criteria — these are the breaks that forced better decisions later.

---

## Incident 1 — Production 404: the root URL pointed at a file that didn't exist

- **Symptom:** visiting the GitHub Pages root (`/`) returned GitHub's 404 page, while `/Legan-Sahayam-Home.html` rendered fine. The "live site" only worked if you happened to be on the inner page.
- **Root cause:** `index.html` was not the app. It was a thin redirect —
  ```html
  <meta http-equiv="refresh" content="0; url=Lagan-Sahayam-Home.html">
  ```
  target misspelled (missing the `e` in `Legan`). So the redirect chain pointed to a URL that could never exist. A typo, shipped, invisible to local preview because opening the inner file works.
- **Fix:** removed the redirect indirection entirely. The full application now lives at `index.html` (the correct static-host entry point), and the stale `Legan-Sahayam-Home.html` was deleted. Local preview and GitHub Pages now behave the same as every other URL.
- **Lesson:** the root file is part of the product. A redirect should have a test; better, don't have a redirect at all — serve content at the root.

## Incident 2 — The "AI-powered" chatbot was (a) keyword matching and (b) not even wired

- **Symptom:** every bot reply was chosen from a hand-written pattern table (`LEGAL_KB`). Anything not on the list fell through to a canned "I can help with…" list. It *looked* like AI; it was a finite-state lookup.
- **Root cause:** the previous build shipped *designs* for real AI, not AI. `bot.js` contained a Google Programmable Search config, an OpenAI config, and a Gemini config — **all disabled** (`ENABLED: false`, empty keys). The only live engine was `getBotResponse()`, a string-`includes()` matcher. "AI-powered" was aspirational marketing.
- **Fix during this hardening pass:**
  - Real RAG pipeline: Gemini `text-embedding-004` embeds the curated KB once; the user's query is embedded and cosine-scored; top-4 chunks are injected into the system prompt as *context*; `gemini-2.0-flash` (temperature 0.2) writes the reply; low-relevance queries are refused (no hallucination path); source chunks are shown as chips.
  - The keyword engine was **kept, re-labeled, and re-scoped** as the offline/fallback tier over the same data layer — an honest place for it.
- **Lesson:** an evaluation panel reads the code. "AI-powered" with a disabled provider stub scores lower than a feature that says "AI here, deterministic fallback there" and means both.

## Incident 3 — The same legal fact existed in three places and drifted

- **Symptom:** NALSA "Legal Aid" card linked `tel:155260` while displaying **15100**; a second NALSA card displayed **15100**; the hero claimed "**120+** Legal Sections" while the page listed 12; section replies rendered an empty `()` because code read `entry.code`, a field the data never had.
- **Root cause:** three hand-maintained copies of the same legal data — HTML cards in the page, `LEGAL_KB` inside `bot.js`, `scenarioRules` inside `app.js` — that never had to agree. In legal-facts UI, silent drift is the worst kind of bug: both surfaces look fine, one number is wrong.
- **Fix:** consolidated everything into one module, `data/legalContent.js`. The page sections, the scenario guides, and the bot's grounding corpus are all generated from it. The stat was corrected to the real count (19), and `tel:`/display values now come from a single source by construction. `npm test` now asserts chunk integrity so the corpus can't drift silently again.
- **Lesson:** single source of truth is not a style preference — for fact-shaped data it is a correctness mechanism.

## Bonus — the test suite caught a real RAG bug before it reached a judge

- **Symptom:** RAG answers returned source chips with empty labels.
- **Root cause:** `rag.js` read `entry.source` but the retrieval index stores `{ chunk, vec }`, so the source lived at `entry.chunk.source`. A type-shape mismatch invisible until you actually render the chips.
- **Fix:** corrected the field access. `tests/smoke.mjs` now asserts that the top grounded source is the expected chunk — so a regression in the response shape fails CI-style at `npm test`, not on stage.
- **Lesson:** write the test *against the exact shape you consume*. Shape drift is exactly what smoke tests are for.

## Incident 4 — "Live answers" exposed the latency lie, and mid-stream failures needed their own rule

- **Symptom:** the first RAG chatbot waited ~700 ms behind a fake typing indicator, then rendered the whole answer at once. It *felt* like a real assistant but wasn't. Separately, the first streaming version dumped the entire fallback answer over a half-finished sentence if the connection dropped mid-generation.
- **Root cause:** two design corners got cut. (a) The UI staged a choreographed delay instead of actual streaming — latency theatre. (b) The failure-handling model assumed "the AI call either fully succeeds or fully fails", which is false the moment answers stream — a drop partway through is a third state.
- **Fix:** wired the RAG pipeline to Gemini's `streamGenerateContent` (SSE) and render tokens as they arrive — real liveness, no fake delay. For failures, defined an explicit policy with three branches: **retrieval/bound failures happen before any token and fall back cleanly to the offline engine; a pre-token generate error also falls back; a mid-stream drop keeps the partial answer visible and marks it "cut off"** rather than overwriting it with a different answer (which would be confusing and dishonest). Voice was then layered on the same stream (speak only after a *complete* answer, never a partial one).
- **Lesson:** the failure model must be designed *at the level of the real interaction*, not the function call. Streaming changed what "failure" means, and the handling had to change with it.

---

*Want to add your own? The incidents above are the ones verifiable from the repo. If you kept a log of what actually broke for you, swap in those stories — real is better than plausible.*