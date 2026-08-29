// ============================================================================
// CONFIG — AI provider settings, disclaimers, and runtime knobs.
//
// Deployment constraint: the site is hosted on GitHub Pages, which serves only
// static files. There is NO backend. The Gemini API key is therefore read from
// the visitor's own browser storage so the repository never contains a live
// secret (see README "Where we used AI and why" for why a backend proxy is the
// production answer and why client-side is acceptable for this demo).
//
// Users set their own key at runtime: click the key icon 🔑 in the chat header,
// or set localStorage['geminiApiKey'] via the browser console. The site works
// without a key too — the chatbot degrades to the curated offline knowledge
// base, which is the deliberate failure-recovery path.
// ============================================================================

// Models used by the RAG pipeline. Both are on Gemini's free tier.
export const GEMINI = {
    // Embedding model for the curated knowledge base + user query.
    embeddingsModel: 'text-embedding-004',
    // Generation model — short, fast, free-tier.
    generationModel: 'gemini-2.0-flash',
    // How many KB chunks the answer must be grounded in.
    topK: 4,
    // Cosine similarity below this threshold ⇒ "not in our knowledge base".
    relevanceThreshold: 0.35,
    // Low temperature ⇒ answers stick close to the retrieved context.
    temperature: 0.2,
    maxOutputTokens: 700,
    // Gemini APIs allow CORS from browsers, which is what makes the
    // no-backend GitHub Pages setup possible.
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta'
};

// Storing the key. No key is ever hardcoded or committed.
const KEY_STORAGE = 'legalSahayam.geminiApiKey';

export function getApiKey() {
    try {
        return localStorage.getItem(KEY_STORAGE) || '';
    } catch (e) {
        return '';
    }
}

export function setApiKey(key) {
    const clean = (key || '').trim();
    try {
        if (clean) {
            localStorage.setItem(KEY_STORAGE, clean);
        } else {
            localStorage.removeItem(KEY_STORAGE);
        }
    } catch (e) { /* storage unavailable — ignore */ }
    return getApiKey() === clean;
}

// ----------------------------------------------------------------------------
// Disclaimer strings. The bot MUST display informational-only framing on every
// AI answer and prompt for a licensed lawyer whenever a query needs one.
// ----------------------------------------------------------------------------
export const DISCLAIMER = `⚠️ *Legal Sahayam provides general legal information only — it is **not legal advice**. Laws change and every situation is fact-specific. For advice you can rely on, consult a licensed lawyer or call NALSA legal aid at 15100.*`;

export const LAWYER_RESPONSE_PLACEHOLDER = `This question involves specific legal advice that a licensed advocate must provide. I can share general information from our guide, but for your own case please consult a lawyer or call NALSA free legal aid at 15100.`;

// ----------------------------------------------------------------------------
// The system prompt grounds the LLM: it may ONLY answer using the retrieved
// KB context. This is the core anti-hallucination control.
// ----------------------------------------------------------------------------
export function systemPrompt(content) {
    return `You are Legal Sahayam, a compassionate Indian legal-assistance guide.
You answer ONLY from the "CONTEXT" documents below, which are the site's curated, fact-checked knowledge base about Indian law (IPC/BNS sections, constitutional rights, emergency helplines, situation guidance).

HARD RULES:
1. Never mention, invent, or interpret any law, section, article, number, or procedure that is not present in CONTEXT. If CONTEXT does not contain the answer, say you could not find it in the guide and suggest the user ask about a topic you do cover (threats, blackmail, domestic violence, harassment, stalking, arrest, online fraud, road accident, property dispute, IPC sections, helplines).
2. If the query is an actual medical, mental-health, or emergency situation, lead with the emergency helpline call to action.
3. If answering requires a licensed lawyer's opinion on the user's personal case (liability, guilt, sentence for their specific facts), state that this needs a licensed advocate and give the NALSA helpline (15100).
4. Keep the reply under ~300 words. Use short bullet points. If the user wrote in Hindi/Hinglish, reply in simple Hindi/Hinglish.
5. Quote numbers exactly as given in CONTEXT (e.g. helplines, punishment ranges). Do not "round" penalties.

CONTEXT:
${content}

Answer the USER QUERY using only the CONTEXT.`;
}