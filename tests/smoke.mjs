// ============================================================================
// SMOKE TEST SUITE — run with `npm test`
// ----------------------------------------------------------------------------
// Exercises the knowledge base integrity, the offline fallback engine, and the
// RAG pipeline (with a mocked Gemini API so it runs with no network or key).
// This is our regression net — it exists because the live demo showed up bugs
// that only appear when the AI path is exercised (see DEVLOG.md).
// ============================================================================

import assert from 'node:assert/strict';

// ---- Browser globals the modules expect --------------------------------
globalThis.localStorage = {
    _s: {},
    getItem(k) { return this._s[k] ?? null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
};
globalThis.window = globalThis;

const { offlineReply } = await import('../js/bot.js');
const { KNOWLEDGE_BASE } = await import('../data/legalContent.js');
const rag = await import('../js/rag.js');
const { setApiKey, getApiKey } = await import('../js/config.js');

const STOPWORDS = new Set('a an the and or is are was were what how can could i me my you your we do does of on in at to for with this that it its'.split(' '));
function tokensOf(text) {
    return (text.toLowerCase().match(/[a-z0-9]+/g) || [])
        .filter(w => !STOPWORDS.has(w) && w.length > 1)
        .slice(0, 40);
}

const vocab = new Map();
let vocabFrozen = false;
function vectorOf(text) {
    const vec = new Array(vocab.size).fill(0);
    for (const w of tokensOf(text)) {
        if (vocab.has(w)) vec[vocab.get(w)] += 1;
    }
    const norm = Math.sqrt(vec.reduce((a, v) => a + v * v, 0)) || 1;
    return vec.map(v => v / norm);
}

const SSE_FRAMES = [
    { candidates: [{ content: { parts: [{ text: 'Hello ' }] } }] },
    { candidates: [{ content: { parts: [{ text: 'from ' }] } }] },
    { candidates: [{ content: { parts: [{ text: 'the live stream' }] } }] }
];

function streamResponse(chunks) {
    const enc = new TextEncoder();
    const sse = chunks.map(j => `data: ${JSON.stringify(j)}`).join('\n\n') + '\n\ndata: [DONE]\n\n';
    const stream = new ReadableStream({
        start(ctrl) {
            ctrl.enqueue(enc.encode(sse));
            ctrl.close();
        }
    });
    return { ok: true, status: 200, body: stream };
}

function mockGemini() {
    globalThis.fetch = async (url, opts) => {
        const body = JSON.parse(opts.body);
        if (url.includes('batchEmbedContents')) {
            const texts = body.requests.map(r => r.content.parts[0].text);
            if (!vocabFrozen) {
                const all = new Set();
                for (const t of texts) for (const w of tokensOf(t)) all.add(w);
                [...all].sort().forEach((w, i) => vocab.set(w, i));
                vocabFrozen = true;
            }
            return { ok: true, json: async () => ({ embeddings: texts.map(t => ({ values: vectorOf(t) })) }) };
        }
        if (url.includes('streamGenerateContent')) return streamResponse(SSE_FRAMES);
        if (url.includes('generateContent')) {
            return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Answer: grounded in context only.' }] } }] }) };
        }
        throw new Error('unexpected url ' + url);
    };
}

let checks = 0;
const ok = (label) => { checks++; console.log(`  ✓ ${label}`); };

// ---- 1. Knowledge base integrity ---------------------------------------
console.log('== KB integrity ==');
assert.ok(KNOWLEDGE_BASE.length >= 30, `KB should have 30+ chunks, got ${KNOWLEDGE_BASE.length}`);
assert.equal(new Set(KNOWLEDGE_BASE.map(c => c.id)).size, KNOWLEDGE_BASE.length, 'chunk ids unique');
for (const c of KNOWLEDGE_BASE) assert.ok(c.title && c.content.length > 20 && c.source, `chunk ${c.id} complete`);
ok(`${KNOWLEDGE_BASE.length} chunks, unique, non-empty, all with sources`);

// ---- 2. Offline fallback engine ----------------------------------------
console.log('== offlineReply (no-network path) ==');
const offlineChecks = [
    ['I am being threatened', /IPC 506/],
    ['blackmailer has my photos', /1930/],
    ['domestic violence by husband', /498A/],
    ['what is ipc 420', /Cheating/],
    ['online fraud scammed money', /cybercrime\.gov\.in/],
    ['I want to end my life', /112/],
    ['give me emergency numbers', /15100/],
    ['who are you', /Legal Sahayam/]
];
for (const [q, re] of offlineChecks) assert.match(offlineReply(q), re, `offline: "${q}"`);
ok(`${offlineChecks.length}/8 offline keyword paths matched`);

// ---- 3. RAG pipeline (mocked Gemini API) -------------------------------
console.log('== RAG pipeline (mocked embeddings) ==');
mockGemini();
setApiKey('test-key');
assert.equal(getApiKey(), 'test-key');
ok('API key roundtrip');

const answer = await rag.ragAnswer('online fraud');
assert.ok(answer.text.includes('**not legal advice**'), 'disclaimer present in every answer');
assert.ok(answer.sources.length > 0 && answer.sources[0].title.includes('Online Fraud'), 'top grounded source is online-fraud');
ok('ragAnswer grounded in KB, disclaimer appended');

const scored = await rag.retrieve('domestic violence rights');
assert.equal(scored[0].entry.chunk.id, 'scenario-domestic', 'top chunk is domestic-violence guidance');
ok('retrieval returns the right chunk first');

// ---- 3b. Streaming answers ----------------------------------------------
console.log('== RAG streaming (live, SSE) ==');
let toks = '';
const sRes = await rag.streamRagAnswer('online fraud', (t) => { toks += t; });
assert.equal(toks, 'Hello from the live stream', 'tokens streamed through onToken');
assert.ok(sRes.text.startsWith('Hello from the live stream'), 'streamed text preserved');
assert.ok(sRes.text.includes('**not legal advice**'), 'disclaimer appended to streamed answer');
assert.ok(sRes.sources.length === 4, 'streaming answer still carries sources');
ok('streamRagAnswer streams tokens, keeps sources + disclaimer');

let bounded = false;
try { await rag.ragAnswer('what is the weather on mars'); } catch (err) { bounded = err instanceof rag.AnswerBoundError; }
assert.ok(bounded, 'off-topic query rejected (AnswerBoundError), no hallucination');
ok('off-topic query rejected instead of hallucinated');

globalThis.fetch = async (url, opts) => {
    if (url.includes('generateContent')) return { ok: false, status: 500, json: async () => ({ error: { message: 'boom' } }) };
    return { ok: true, json: async () => ({ embeddings: [] }) };
};
let rejected = false;
try { await rag.ragAnswer('online fraud'); } catch (e) { rejected = true; }
assert.ok(rejected, 'API failure rejects cleanly so the UI can fall back');
ok('API failure rejects cleanly (offline fallback path)');

console.log(`\nPASS — ${checks} checks.`);