// ============================================================================
// OFFLINE FALLBACK BOT (js/bot.js)
// ----------------------------------------------------------------------------
// This is the deterministic, zero-AI answer engine. It runs on pure keyword
// matching over the SAME data layer the page renders (data/legalContent.js).
//
// Why it exists — failure recovery: the site is static and the AI chatbot
// needs (a) an API key the user enters at runtime and (b) an internet
// connection. When either is missing, or when the Gemini API errors, we MUST
// still give the user a correct, compassionate answer. So every AI path is
// wrapped, and this module is the final fallback. It is deliberately simple —
// adding an LLM to these short keyword lookups would be using AI where it is
// not needed (see README "Where we deliberately did NOT use AI and why").
// ============================================================================

import { IPC_SECTIONS, SCENARIOS, CONTACTS } from '../data/legalContent.js';

const BOT_NAME = 'Legal Sahayam';

// ---------------------------------------------------------------------------
// Quick lookup helpers
// ---------------------------------------------------------------------------
function findSection(raw) {
    const num = String(raw || '').toLowerCase().replace(/^0+/, '');
    return IPC_SECTIONS.find(s => s.altCode === num || s.code.toLowerCase() === num);
}

function findScenario(text) {
    return SCENARIOS.find(sc => text.includes(sc.key));
}

// ---------------------------------------------------------------------------
// Curated responses (kept short; the page already shows full guidance)
// ---------------------------------------------------------------------------
const RESPONSES = {
    greeting: `Namaste! 🙏 I'm ${BOT_NAME}, your legal assistant.

I can help with:
• 🛡️ Being threatened or blackmailed
• 🏠 Domestic violence
• 👤 Harassment or stalking
• 🖐️ You or someone got arrested
• 💳 Online fraud
• 📜 Understanding IPC sections (try "what is IPC 506?")
• 📞 Emergency numbers

How can I help you today?`,

    whoami: `I'm ${BOT_NAME} ⚖️, your personal legal assistant.

I help people who may not know the law understand:
• Their legal rights 🛡️
• IPC/BNS sections 📖
• What to do in dangerous situations 🚨
• Important emergency numbers 📞

Tell me what's happening and I'll guide you. You're not alone.`,

    suicide: `💙 PLEASE READ THIS — Your life is precious and you matter.

You deserve help and support. Please reach out to someone right now:

📞 24/7 HELPLINES:
• Tele-MANAS: 14416
• KIRAN (mental health): 1800-599-0019
• AASRA: +91-9820466726
• iCall (TISS): 9152987821

Talk to a trusted friend or family member. There is always hope, even when it doesn't feel like it. If you feel in immediate danger, please call **112** right now.`,

    emergencyNumbers: `📞 IMPORTANT EMERGENCY NUMBERS:

🚨 **Emergency:**
• **112** – National Emergency (all services)
• **100** – Police
• **108** – Ambulance

👩 **Women & Child:**
• **1091** – Women Helpline
• **181** – Women in Distress / Domestic Abuse
• **1098** – Child Helpline

💳 **Cyber & More:**
• **1930** – Cyber Crime (online fraud)
• **15100** – NALSA Legal Aid
• **104** – Health Helpline

💡 Tip: **112** routes you to the right emergency service automatically and works nationwide.`,

    legalAid: `⚖️ LEGAL AID & FILING A COMPLAINT

👨‍⚖️ **FREE LEGAL AID (Article 39A):** If you cannot afford a lawyer, you have the RIGHT to free legal assistance.
• Call **15100** (NALSA helpline)
• Visit your district **Legal Services Authority (DLSA)**

📝 **HOW TO FILE AN FIR:**
1. Go to the police station where the offence happened
2. State your complaint — the officer MUST register the FIR
3. You have the right to a **free copy** of the FIR

❌ **IF POLICE REFUSE:**
• Write to the **Superintendent of Police (SP)**
• Approach the **Judicial Magistrate**, who can order the police to register the FIR
• For online fraud or cyber crime, report at **cybercrime.gov.in** or call **1930**`,

    fallback: `I'm here to help! 🤖 I can assist with:

🛡️ I'm being threatened — safety & sections
🔒 Blackmail / Extortion — action to take
🏠 Domestic violence — your rights
👤 Harassment / Stalking — protections
🖐️ Someone arrested — rights
💳 Online fraud — report it
🚗 Road accident — what to do
🏢 Property dispute — guidance
📜 IPC sections — e.g. "what is IPC 506"
📞 Emergency numbers — helplines

Just type your situation. I'm here for you. 🙏`
};

// ---------------------------------------------------------------------------
// Pattern tables for scenario → response, mapped onto the data layer so the
// offline bot and the page cards never disagree.
// ---------------------------------------------------------------------------
const SCENARIO_PATTERNS = {
    threat:    ['threat', 'threaten', 'intimidat', 'scared', 'afraid', 'danger', 'fear for life', 'kill me'],
    blackmail: ['blackmail', 'extort', 'leaked', 'mms', 'compromising photos'],
    domestic:  ['domestic', 'abuse', 'husband', 'marital', 'beaten', 'dowry', 'mother in law', 'mother-in-law'],
    harassment:['harass', 'stalk', 'follow', 'eve teasing', 'eve-teasing', 'molest', 'lewd', 'torture'],
    arrest:    ['arrest', 'police custody', 'fir', 'jail', 'detention', 'police took'],
    fraud:     ['fraud', 'scam', 'cheat', 'otp', 'phishing', 'lost money', 'fake call'],
    accident:  ['accident', 'crash', 'hit and run', 'collision', 'road rage'],
    land:      ['property', 'land dispute', 'plot', 'ownership', 'builder', 'kabza', 'registry']
};

function scenarioReply(key) {
    const sc = SCENARIOS.find(s => s.key === key);
    if (!sc) return RESPONSES.fallback;
    return `🎯 **${sc.title}**\n\n${sc.kb}`;
}

// ---------------------------------------------------------------------------
// Section lookup reply
// ---------------------------------------------------------------------------
function sectionReply(raw) {
    const sec = findSection(raw);
    if (!sec) {
        return `I couldn't find the exact section **${raw}** in my database yet, but I can help with common sections like 302, 354, 376, 420, 498A, 506, 384, etc.\n\nOr tell me your situation (e.g. "I'm being threatened") and I'll guide you. 🙏`;
    }
    return `📖 **IPC ${sec.code} — ${sec.title}**\n\n"${sec.desc}"\n\nHave another section? Just type "what is IPC <number>" and I'll find it! ⚖️`;
}

// ---------------------------------------------------------------------------
// Main entry point — deterministic answer for any input.
// ---------------------------------------------------------------------------
export function offlineReply(input) {
    const text = String(input || '').toLowerCase().trim();

    // Safety first: mental-health crisis always takes priority.
    const crisis = RESPONSES.suicide;
    const crisisPatterns = ['suicide', 'depress', 'hopeless', "don't want to live", 'end my life', 'no reason to live', 'self harm'];
    if (crisisPatterns.some(p => text.includes(p))) return crisis;

    // Exact section codes ("ipc 506", "section 420", "bns 302", "506 section").
    const sectionQ = text.match(/(?:section|ipc|bns)\s*(\d{1,4}[a-z]?)/i) ||
                     text.match(/(\d{1,4}[a-z]?)\s*(?:section|ipc|bns)/i) ||
                     text.match(/ipc\s*(\d{1,4}[a-z]?)/i) ||
                     text.match(/bns\s*(\d{1,4}[a-z]?)/i);
    if (sectionQ) return sectionReply(sectionQ[1]);

    // Greeting / identity
    if (text.length < 10 && /^(hi|hello|hey|namaste|salaam|good morning|good evening|good afternoon)\b/.test(text)) return RESPONSES.greeting;
    if (/(who are you|what can you do|yourself)/.test(text)) return RESPONSES.whoami;

    // Emergency/helpline keywords
    if (/(emergency|helpline|number|call|ambulance|police number)/.test(text)) return RESPONSES.emergencyNumbers;
    if (/(lawyer|legal aid|free lawyer|advocate|how to file|complaint|fir kaise)/.test(text)) return RESPONSES.legalAid;

    // Scenario matching
    for (const [key, patterns] of Object.entries(SCENARIO_PATTERNS)) {
        if (patterns.some(p => text.includes(p))) return scenarioReply(key);
    }

    return RESPONSES.fallback;
}

export const OFFLINE_SUGGESTIONS = ['I am being threatened', 'Online fraud kya karu?', 'What is IPC 506?', 'Emergency numbers'];

// Kept for backwards compatibility with any inline scripts that may exist.
window.getBotResponse = offlineReply;