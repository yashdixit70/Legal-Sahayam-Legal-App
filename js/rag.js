// ============================================================================
// RAG ENGINE (js/rag.js)
// ----------------------------------------------------------------------------
// Retrieval-augmented generation over the curated knowledge base.
//
// Pipeline:
//   1. KNOWLEDGE_BASE (data/legalContent.js) is embedded once with Gemini's
//      text-embedding-004 (batch endpoint, one network call).
//   2. The user's query is embedded and cosine-scored against every chunk.
//   3. Top-k chunks are pasted into the system prompt as CONTEXT.
//   4. gemini-2.0-flash generates an answer under hard rules that forbid
//      inventing anything not present in CONTEXT (see config.js systemPrompt).
//
// Every step that can fail (missing key, network, API error, timeout) throws a
// normal Error; the chatbot layer catches it and falls back to the offline
// keyword engine. The demo therefore never dies.
//
// Why RAG and a small curated KB instead of (a) a static FAQ or (b) an
// ungrounded LLM — documented at length in README.md "Where we used AI and why".
// Short version: (a) a static FAQ can't survive paraphrase, multi-language
// Hinglish input, or follow-ups; (b) an ungrounded LLM would confidently
// invent IPC section numbers, which in this domain is dangerous. RAG keeps the
// flexibility of a language model while binding it to facts we control.
// ============================================================================

import { KNOWLEDGE_BASE } from '../data/legalContent.js';
import { GEMINI, getApiKey, systemPrompt, DISCLAIMER } from './config.js';

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------
let indexPromise = null;   // lazily-built embedding store (memoised)
let failureReason = '';    // last known failure, for diagnostics in the UI

function endpoint(model, action) {
    return `${GEMINI.baseUrl}/models/${model}:${action}`;
}

async function fetchJson(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        if (!res.ok) {
            let detail = `HTTP ${res.status}`;
            try {
                const body = await res.json();
                if (body.error && body.error.message) detail = body.error.message;
            } catch (e) { /* non-JSON error body */ }
            throw new Error(detail);
        }
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
}

// Embed an array of strings in one batch call. Returns array of Float32Array.
async function embedTexts(texts) {
    const key = getApiKey();
    if (!key) throw new Error('No Gemini API key set.');
    const url = `${endpoint(GEMINI.embeddingsModel, 'batchEmbedContents')}?key=${encodeURIComponent(key)}`;
    const data = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: texts.map(text => ({
                model: `models/${GEMINI.embeddingsModel}`,
                content: { parts: [{ text }] }
            }))
        })
    }, 30000);
    if (!data.embeddings) throw new Error('Malformed embedding response.');
    return data.embeddings.map(e => Float32Array.from(e.values || []));
}

// Build/memoise the KB index. Each chunk gets a title+content embedding so a
// question phrased as "what is IPC 506" still matches the chunk about IPC 506.
async function ensureIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = (async () => {
        const texts = KNOWLEDGE_BASE.map(c => `${c.title}\n${c.content}`);
        const vectors = await embedTexts(texts);
        if (vectors.length !== KNOWLEDGE_BASE.length) {
            throw new Error('Embedding count mismatch.');
        }
        return KNOWLEDGE_BASE.map((chunk, i) => ({ chunk, vec: vectors[i] }));
    })().catch(err => {
        // Reset so a later retry (e.g. after the user enters a valid key) works.
        failureReason = err.message || String(err);
        indexPromise = null;
        throw err;
    });
    return indexPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function lastFailure() {
    return failureReason;
}

// Query → retrieval chain. Throws with a friendly message on any failure.
export async function retrieve(query) {
    const index = await ensureIndex();
    const [qvec] = await embedTexts([query]);
    const scored = index
        .map(entry => ({ entry, score: cosine(qvec, entry.vec) }))
        .sort((a, b) => b.score - a.score);
    return scored;
}

// Full RAG answer. Returns { text, sources } where sources are the chunk titles
// the answer was grounded in (rendered as chips in the chat).
export async function ragAnswer(query) {
    const scored = await retrieve(query);
    const top = scored.slice(0, GEMINI.topK);

    const bestScore = top.length ? top[0].score : 0;
    if (bestScore < GEMINI.relevanceThreshold) {
        // Nothing in the KB is plausibly related — do NOT let the model free
        // associate. This is the "right tool" boundary: refuse to guess.
        throw new AnswerBoundError();
    }

    const context = top
        .map((e, i) => `[${i + 1}] ${e.entry.chunk.title}\n${e.entry.chunk.content}`)
        .join('\n\n');

    const key = getApiKey();
    const url = `${endpoint(GEMINI.generationModel, 'generateContent')}?key=${encodeURIComponent(key)}`;
    const data = await fetchJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt(context) }] },
            contents: [{ role: 'user', parts: [{ text: query }] }],
            generationConfig: {
                temperature: GEMINI.temperature,
                maxOutputTokens: GEMINI.maxOutputTokens
            }
        })
    }, 45000);

    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts || !parts.length) {
        // e.g. safety filtering returned no text.
        throw new Error('The model returned an empty answer.');
    }
    const text = parts.map(p => p.text || '').join('').trim();
    if (!text) throw new Error('The model returned an empty answer.');

    return {
        text: `${text}\n\n${DISCLAIMER}`,
        sources: top.map(e => ({ title: e.entry.chunk.source, score: e.score }))
    };
}

// Streaming variant for "live answers". Same retrieval + grounding, but the
// generation response is consumed as Server-Sent Events so tokens render in
// the chat as they arrive. `onToken` is called with each text fragment.
//
// Failure semantics: all retrieval/bound failures happen BEFORE any token is
// emitted, so the caller can fall back to the offline engine cleanly. If the
// stream dies mid-way, `receivedAny` tells the caller it already showed text —
// it should keep what it has rather than swap to a different fallback answer.
export async function streamRagAnswer(query, onToken) {
    const scored = await retrieve(query);
    const top = scored.slice(0, GEMINI.topK);

    const bestScore = top.length ? top[0].score : 0;
    if (bestScore < GEMINI.relevanceThreshold) throw new AnswerBoundError();

    const context = top
        .map((e, i) => `[${i + 1}] ${e.entry.chunk.title}\n${e.entry.chunk.content}`)
        .join('\n\n');

    const key = getApiKey();
    const url = `${endpoint(GEMINI.generationModel, 'streamGenerateContent')}?alt=sse&key=${encodeURIComponent(key)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    let full = '';
    let receivedAny = false;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt(context) }] },
                contents: [{ role: 'user', parts: [{ text: query }] }],
                generationConfig: {
                    temperature: GEMINI.temperature,
                    maxOutputTokens: GEMINI.maxOutputTokens
                }
            }),
            signal: controller.signal
        });
        if (!res.ok || !res.body) {
            let detail = `HTTP ${res.status}`;
            try {
                const body = await res.json();
                if (body.error && body.error.message) detail = body.error.message;
            } catch (e) { /* non-JSON error body */ }
            throw new Error(detail);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let nl;
            while ((nl = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (!line.startsWith('data:')) continue;
                const payload = line.slice(5).trim();
                if (!payload || payload === '[DONE]') continue;
                try {
                    const j = JSON.parse(payload);
                    const parts = j.candidates?.[0]?.content?.parts;
                    const frag = parts ? parts.map(p => p.text || '').join('') : '';
                    if (frag) {
                        full += frag;
                        receivedAny = true;
                        onToken && onToken(frag);
                    }
                } catch (e) { /* skip malformed frame */ }
            }
        }
    } finally {
        clearTimeout(timer);
    }

    const text = full.trim();
    if (!text) throw new Error('The model returned an empty answer.');

    return {
        text: `${text}\n\n${DISCLAIMER}`,
        sources: top.map(e => ({ title: e.entry.chunk.source, score: e.score })),
        receivedAny
    };
}

// Special error: query is outside the curated KB. The chatbot should route the
// user back to supported topics rather than attempt an answer.
export class AnswerBoundError extends Error {
    constructor() {
        super('Query is outside the curated knowledge base.');
    }
}

export { GEMINI };